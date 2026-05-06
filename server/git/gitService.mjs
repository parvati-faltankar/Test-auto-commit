/**
 * gitService.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Low-level Git operations for the AI agent workflow.
 * All operations are scoped to PROJECT_ROOT and never touch the main/master branch.
 *
 * Uses: simple-git (async/await API)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import simpleGit from 'simple-git';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Resolve project root (two levels up: server/git/ → server/ → project root) ──
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '../../');

// ── Protected branches — never commit directly to these ─────────────────────
const PROTECTED_BRANCHES = ['main', 'master'];

// ── Initialize simple-git bound to project root ──────────────────────────────
const git = simpleGit(PROJECT_ROOT);

// ─────────────────────────────────────────────────────────────────────────────
// getCurrentBranch()
// Returns the name of the currently checked-out branch.
// ─────────────────────────────────────────────────────────────────────────────
export async function getCurrentBranch() {
  const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
  return branch.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// createBranch(branchName)
// Creates and checks out a new branch from the current HEAD.
// Throws if the branch name already exists.
// ─────────────────────────────────────────────────────────────────────────────
export async function createBranch(branchName) {
  console.log(`\n[git] Creating branch: ${branchName}`);

  // Guard: list existing branches and reject duplicates
  const { all: existingBranches } = await git.branchLocal();
  if (existingBranches.includes(branchName)) {
    throw new Error(`[git] Branch "${branchName}" already exists.`);
  }

  await git.checkoutLocalBranch(branchName);
  console.log(`[git] ✅ Switched to new branch: ${branchName}`);
  return branchName;
}

// ─────────────────────────────────────────────────────────────────────────────
// commitChanges(description)
// Stages all modified/new/deleted files and creates a commit.
// Returns the short commit hash.
// ─────────────────────────────────────────────────────────────────────────────
export async function commitChanges(description) {
  const currentBranch = await getCurrentBranch();

  // Safety guard: refuse to commit directly to protected branches
  if (PROTECTED_BRANCHES.includes(currentBranch)) {
    throw new Error(
      `[git] 🚫 Refusing to commit on protected branch "${currentBranch}". ` +
      `AI changes must be isolated in a feature branch.`
    );
  }

  console.log(`\n[git] Staging all changes...`);
  await git.add('-A');

  // Check if there's actually anything to commit
  const status = await git.status();
  if (status.isClean()) {
    console.log(`[git] ℹ️  Nothing to commit — working tree is clean.`);
    return null;
  }

  const commitMessage = `AI: ${description}`;
  console.log(`[git] Committing with message: "${commitMessage}"`);

  const result = await git.commit(commitMessage);
  const hash = result.commit;
  console.log(`[git] ✅ Committed: ${hash} on branch "${currentBranch}"`);
  return hash;
}

// ─────────────────────────────────────────────────────────────────────────────
// rollback()
// Safely undoes the last commit and returns to the main branch.
// Uses --hard reset only on the AI feature branch — never on main/master.
//
// Strategy:
//   1. Verify we are NOT on a protected branch
//   2. Reset HEAD~1 (undo last commit, restore files to pre-commit state)
//   3. Checkout main so the project is back to a working state
// ─────────────────────────────────────────────────────────────────────────────
export async function rollback() {
  const currentBranch = await getCurrentBranch();
  console.log(`\n[git] 🔄 Rolling back on branch: "${currentBranch}"`);

  if (PROTECTED_BRANCHES.includes(currentBranch)) {
    throw new Error(
      `[git] 🚫 Rollback refused on protected branch "${currentBranch}". ` +
      `This should never happen — file a bug.`
    );
  }

  // Verify there is at least one commit to roll back
  try {
    await git.revparse(['HEAD~1']);
  } catch {
    // No parent commit — just reset working tree to HEAD (discard unstaged changes)
    console.log(`[git] ⚠️  No parent commit found. Discarding uncommitted changes only.`);
    await git.checkout(['.']);
    await git.clean('fd'); // remove untracked files/dirs
    await checkoutMain();
    return;
  }

  console.log(`[git] Resetting HEAD~1 (--hard)...`);
  await git.reset(['--hard', 'HEAD~1']);
  console.log(`[git] ✅ Last commit undone.`);

  await checkoutMain();
}

// ─────────────────────────────────────────────────────────────────────────────
// showDiff()
// Logs a unified diff of all staged + unstaged changes.
// Call this BEFORE commitChanges() to preview what will be committed.
// ─────────────────────────────────────────────────────────────────────────────
export async function showDiff() {
  console.log(`\n[git] ──── Diff Preview ──────────────────────────────────`);

  const unstagedDiff = await git.diff();          // unstaged changes
  const stagedDiff   = await git.diff(['--cached']); // staged changes

  const combined = (stagedDiff + unstagedDiff).trim();

  if (!combined) {
    console.log(`[git] No changes detected in working tree.`);
    return;
  }

  // Colour each line: green for additions, red for deletions
  const lines = combined.split('\n');
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      console.log(`\x1b[32m${line}\x1b[0m`); // green
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      console.log(`\x1b[31m${line}\x1b[0m`); // red
    } else if (line.startsWith('@@')) {
      console.log(`\x1b[36m${line}\x1b[0m`); // cyan — hunk header
    } else {
      console.log(line);
    }
  }

  console.log(`[git] ────────────────────────────────────────────────────`);
}

// ─────────────────────────────────────────────────────────────────────────────
// checkoutMain() — internal helper
// Checks out whichever protected branch exists (main preferred over master).
// ─────────────────────────────────────────────────────────────────────────────
async function checkoutMain() {
  const { all: branches } = await git.branchLocal();
  const target = branches.includes('main') ? 'main' : 'master';
  await git.checkout(target);
  console.log(`[git] ✅ Returned to branch: "${target}"`);
}
