/**
 * agentWithGit.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * High-level AI agent lifecycle manager with Git integration.
 *
 * Full lifecycle per AI task:
 *   1. Safety check (never run on main/master)
 *   2. Create isolated branch  → ai-change-{timestamp}
 *   3. Call applyChangesFn    → AI edits files (receives diffHelper)
 *   4. Show diff preview      → line-by-line colour output
 *   5. Optional confirmation  → readline prompt before commit
 *   6. Commit                 → "AI: {task description}"
 *   7. Validation pipeline    → extensible array of validators
 *   8. Rollback on failure    → safe reset + return to main
 *
 * Usage from CJS (server/agent.js):
 *   const { applyAIChange } = await import('./git/agentWithGit.mjs');
 *
 * Usage from another ESM file:
 *   import { applyAIChange } from './git/agentWithGit.mjs';
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import { createInterface } from 'readline';
import * as diffLib from 'diff';
import path from 'path';

import {
  PROJECT_ROOT,
  getCurrentBranch,
  createBranch,
  commitChanges,
  rollback,
  showDiff,
  pushBranch,
} from './gitService.mjs';

const execFileAsync = promisify(execFile);

// ── Protected branches — mirrored here for the lifecycle guard ────────────────
const PROTECTED_BRANCHES = ['main', 'master'];

// ─────────────────────────────────────────────────────────────────────────────
// diffHelper
// Passed into applyChangesFn so the AI/caller can preview individual file
// changes BEFORE they are written — purely for logging.
//
// Usage inside applyChangesFn:
//   diffHelper.previewChange('src/App.tsx', oldContent, newContent);
// ─────────────────────────────────────────────────────────────────────────────
export const diffHelper = {
  /**
   * previewChange(filePath, oldContent, newContent)
   * Computes a line-by-line diff and logs added/removed lines with colour.
   */
  previewChange(filePath, oldContent, newContent) {
    console.log(`\n[diff] ──── ${filePath} ─────────────────────────────`);
    const changes = diffLib.diffLines(oldContent ?? '', newContent ?? '');

    if (changes.length === 1 && !changes[0].added && !changes[0].removed) {
      console.log(`[diff] No changes in this file.`);
      return;
    }

    for (const part of changes) {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const colour = part.added ? '\x1b[32m' : part.removed ? '\x1b[31m' : '\x1b[0m';
      const reset  = '\x1b[0m';

      // Print each line of the chunk with its prefix
      const lines = part.value.split('\n');
      // Remove trailing empty string caused by final newline split
      if (lines[lines.length - 1] === '') lines.pop();
      for (const line of lines) {
        console.log(`${colour}${prefix} ${line}${reset}`);
      }
    }

    console.log(`[diff] ────────────────────────────────────────────────────`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// runBuildValidator()
// Runs `npm run build` in the project root.
// Returns { success: boolean, message: string }
// ─────────────────────────────────────────────────────────────────────────────
export async function runBuildValidator() {
  console.log(`\n[validate] Running build: npm run build`);
  try {
    const { stdout, stderr } = await execFileAsync(
      'npm',
      ['run', 'build'],
      {
        cwd: PROJECT_ROOT,
        shell: true,           // required on Windows
        timeout: 120_000,      // 2-minute hard cap
      }
    );
    if (stdout) console.log(`[build]\n${stdout}`);
    if (stderr) console.log(`[build:stderr]\n${stderr}`);
    console.log(`[validate] ✅ Build passed.`);
    return { success: true, message: 'Build passed.' };
  } catch (err) {
    const output = (err.stdout ?? '') + '\n' + (err.stderr ?? '');
    console.error(`[validate] ❌ Build failed:\n${output}`);
    return { success: false, message: `Build failed:\n${output.trim()}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// runTestValidator()
// Bonus: Runs `npm test` in the project root.
// Skips gracefully if no "test" script is defined.
// Returns { success: boolean, message: string }
// ─────────────────────────────────────────────────────────────────────────────
export async function runTestValidator() {
  console.log(`\n[validate] Running tests: npm test`);
  try {
    const { stdout, stderr } = await execFileAsync(
      'npm',
      ['test', '--if-present'],   // --if-present skips when no test script
      {
        cwd: PROJECT_ROOT,
        shell: true,
        timeout: 180_000,          // 3-minute hard cap
      }
    );
    if (stdout) console.log(`[test]\n${stdout}`);
    if (stderr) console.log(`[test:stderr]\n${stderr}`);
    console.log(`[validate] ✅ Tests passed.`);
    return { success: true, message: 'Tests passed.' };
  } catch (err) {
    const output = (err.stdout ?? '') + '\n' + (err.stderr ?? '');
    console.error(`[validate] ❌ Tests failed:\n${output}`);
    return { success: false, message: `Tests failed:\n${output.trim()}` };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// confirmWithUser(prompt)
// Pauses execution and asks the user a yes/no question in the terminal.
// Returns true if user types 'y' or 'yes' (case-insensitive).
// ─────────────────────────────────────────────────────────────────────────────
async function confirmWithUser(prompt) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`\n${prompt} [y/N]: `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// applyAIChange(task, applyChangesFn, options)
// ─────────────────────────────────────────────────────────────────────────────
// Parameters:
//   task           {string}   Human-readable description → used in commit msg
//   applyChangesFn {Function} Async function that performs the actual file edits.
//                             Receives (diffHelper) so it can preview changes.
//   options        {Object}
//     confirm      {boolean}  If true, pause and ask for confirmation before commit.
//                             Default: false (non-interactive / CI-safe)
//     validators   {Array}    Array of async validator functions, each returning
//                             { success: boolean, message: string }.
//                             Default: [runBuildValidator]
//                             Extend: [runBuildValidator, runTestValidator]
//     push         {boolean}  If true, push the AI branch to origin after all
//                             validators pass. Default: false
//
// Returns:
//   { success: boolean, branch: string, commit: string|null, pushUrl?: string, error?: string }
// ─────────────────────────────────────────────────────────────────────────────
export async function applyAIChange(task, applyChangesFn, options = {}) {
  const {
    confirm    = false,
    validators = [runBuildValidator],
    push       = false,
  } = options;

  const branchName = `ai-change-${Date.now()}`;
  let commitHash   = null;
  let branchCreated = false;

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`[agent] 🤖 Starting AI task: "${task}"`);
  console.log(`${'═'.repeat(60)}`);

  // ── Step 0: Safety guard — refuse to run on protected branches ─────────────
  const currentBranch = await getCurrentBranch();
  if (PROTECTED_BRANCHES.includes(currentBranch)) {
    // If someone starts this while on main, move to a new branch first
    // rather than erroring — safer UX
    console.log(
      `[agent] ⚠️  Currently on protected branch "${currentBranch}". ` +
      `Will create a new AI branch before making any changes.`
    );
  }

  try {
    // ── Step 1: Create isolated branch ─────────────────────────────────────
    console.log(`\n[agent] Step 1/6 — Creating branch...`);
    await createBranch(branchName);
    branchCreated = true;

    // ── Step 2: Apply AI changes ────────────────────────────────────────────
    console.log(`\n[agent] Step 2/6 — Applying AI changes...`);
    await applyChangesFn(diffHelper);
    console.log(`[agent] ✅ AI changes applied.`);

    // ── Step 3: Show diff preview ───────────────────────────────────────────
    console.log(`\n[agent] Step 3/6 — Showing diff preview...`);
    await showDiff();

    // ── Step 4: Optional user confirmation ─────────────────────────────────
    if (confirm) {
      console.log(`\n[agent] Step 4/6 — Awaiting confirmation...`);
      const approved = await confirmWithUser(
        `Proceed with committing these changes for task "${task}"?`
      );
      if (!approved) {
        console.log(`[agent] ❌ User rejected changes. Discarding and returning to main.`);
        // Discard all changes and return to main — no commit was made
        await rollback();
        return { success: false, branch: branchName, commit: null, error: 'Rejected by user.' };
      }
      console.log(`[agent] ✅ User confirmed.`);
    } else {
      console.log(`\n[agent] Step 4/6 — Confirmation skipped (confirm=false).`);
    }

    // ── Step 5: Commit ──────────────────────────────────────────────────────
    console.log(`\n[agent] Step 5/6 — Committing changes...`);
    commitHash = await commitChanges(task);

    // ── Step 6: Validation pipeline ─────────────────────────────────────────
    console.log(`\n[agent] Step 6/6 — Running validation pipeline (${validators.length} validator(s))...`);

    for (let i = 0; i < validators.length; i++) {
      const validator = validators[i];
      console.log(`\n[agent]   Validator ${i + 1}/${validators.length}: ${validator.name || 'anonymous'}`);

      const result = await validator();

      if (!result.success) {
        // Validation failed — rollback and abort
        console.error(`\n[agent] ❌ Validation failed: ${result.message}`);
        console.log(`[agent] 🔄 Triggering rollback...`);
        await rollback();
        return {
          success: false,
          branch:  branchName,
          commit:  null,
          error:   `Validation failed (${validator.name || `validator-${i + 1}`}): ${result.message}`,
        };
      }
    }

    // All validators passed — optionally push branch to remote
    let pushUrl;
    if (push) {
      console.log(`\n[agent] Pushing branch to remote...`);
      await pushBranch(branchName);
      pushUrl = `origin/${branchName}`;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`[agent] 🎉 All done!`);
    console.log(`  Task:   ${task}`);
    console.log(`  Branch: ${branchName}`);
    console.log(`  Commit: ${commitHash}`);
    if (pushUrl) console.log(`  Remote: ${pushUrl}`);
    console.log(`  Status: All ${validators.length} validator(s) passed.`);
    console.log(`${'═'.repeat(60)}\n`);

    return { success: true, branch: branchName, commit: commitHash, pushUrl };

  } catch (err) {
    // Unexpected error — attempt rollback if a branch was created
    console.error(`\n[agent] 💥 Unexpected error: ${err.message}`);

    if (branchCreated) {
      try {
        console.log(`[agent] 🔄 Attempting emergency rollback...`);
        await rollback();
      } catch (rollbackErr) {
        console.error(`[agent] ⚠️  Rollback also failed: ${rollbackErr.message}`);
        console.error(`[agent] ⚠️  Manual intervention may be required. Branch: ${branchName}`);
      }
    }

    return {
      success: false,
      branch:  branchName,
      commit:  null,
      error:   err.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// USAGE EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────
//
// ── From ESM (another .mjs file) ─────────────────────────────────────────────
//
// import { applyAIChange, runBuildValidator, runTestValidator } from './git/agentWithGit.mjs';
// import fs from 'fs/promises';
//
// await applyAIChange(
//   'Update App title to Hello World',
//   async (diffHelper) => {
//     const filePath = 'src/App.tsx';
//     const old = await fs.readFile(filePath, 'utf-8');
//     const updated = old.replace('Vite + React', 'Hello World');
//     diffHelper.previewChange(filePath, old, updated);   // preview before writing
//     await fs.writeFile(filePath, updated, 'utf-8');
//   },
//   {
//     confirm:    true,                                   // pause for user approval
//     validators: [runBuildValidator, runTestValidator],  // run build + tests
//   }
// );
//
// ── From CJS (server/agent.js) ────────────────────────────────────────────────
//
// async function runWithGit() {
//   const { applyAIChange } = await import('./git/agentWithGit.mjs');
//   await applyAIChange('My task', async (diffHelper) => { /* edits */ });
// }
// runWithGit();
