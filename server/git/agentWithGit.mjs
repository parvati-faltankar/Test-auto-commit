/**
 * agentWithGit.mjs
 * High-level AI agent lifecycle manager with Git integration.
 *
 * Full lifecycle:
 *   0    Safety check        (refuse to start on main/master)
 *   0.5  Sync with parent    (pull latest + merge into AI branch)
 *   1    Create AI branch    ai-change-{timestamp}
 *   1.5  Merge parent        Interactive conflict resolution per file
 *   2    Apply AI changes    applyChangesFn(diffHelper)
 *   3    Diff preview        line-by-line colour output
 *   4    Confirmation        optional readline y/N
 *   5    Commit              "AI: {task}"
 *   6    Validate            extensible validator pipeline
 *   7    Push (optional)     publish branch to origin
 *   8    Rollback on fail    safe reset + return to main
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { createInterface } from "readline";
import * as diffLib from "diff";

import {
  PROJECT_ROOT,
  getCurrentBranch,
  createBranch,
  commitChanges,
  rollback,
  showDiff,
  pushBranch,
  getParentBranch,
  pullLatest,
  mergeWithInteractiveResolution,
} from "./gitService.mjs";

const execFileAsync = promisify(execFile);
const PROTECTED_BRANCHES = ["main", "master"];

// ─────────────────────────────────────────────────────────────────────────────
// diffHelper — passed into applyChangesFn for pre-write preview
// ─────────────────────────────────────────────────────────────────────────────
export const diffHelper = {
  previewChange(filePath, oldContent, newContent) {
    console.log("\n[diff] ---- " + filePath + " ----");
    const changes = diffLib.diffLines(oldContent || "", newContent || "");
    if (changes.length === 1 && !changes[0].added && !changes[0].removed) {
      console.log("[diff] No changes."); return;
    }
    for (const part of changes) {
      const prefix = part.added ? "+" : part.removed ? "-" : " ";
      const colour = part.added ? "\x1b[32m" : part.removed ? "\x1b[31m" : "\x1b[0m";
      const lines  = part.value.split("\n");
      if (lines[lines.length - 1] === "") lines.pop();
      for (const line of lines) process.stdout.write(colour + prefix + " " + line + "\x1b[0m\n");
    }
    console.log("[diff] " + "-".repeat(50));
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// runBuildValidator — npm run build in project root
// ─────────────────────────────────────────────────────────────────────────────
export async function runBuildValidator() {
  console.log("\n[validate] Running: npm run build");
  try {
    const { stdout, stderr } = await execFileAsync("npm", ["run", "build"], { cwd: PROJECT_ROOT, shell: true, timeout: 120000 });
    if (stdout) console.log("[build]\n" + stdout);
    if (stderr) console.log("[build:stderr]\n" + stderr);
    console.log("[validate] Build passed.");
    return { success: true, message: "Build passed." };
  } catch (err) {
    const output = (err.stdout || "") + "\n" + (err.stderr || "");
    console.error("[validate] Build FAILED:\n" + output);
    return { success: false, message: "Build failed:\n" + output.trim() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// runTestValidator — npm test --if-present
// ─────────────────────────────────────────────────────────────────────────────
export async function runTestValidator() {
  console.log("\n[validate] Running: npm test");
  try {
    const { stdout, stderr } = await execFileAsync("npm", ["test", "--if-present"], { cwd: PROJECT_ROOT, shell: true, timeout: 180000 });
    if (stdout) console.log("[test]\n" + stdout);
    if (stderr) console.log("[test:stderr]\n" + stderr);
    console.log("[validate] Tests passed.");
    return { success: true, message: "Tests passed." };
  } catch (err) {
    const output = (err.stdout || "") + "\n" + (err.stderr || "");
    console.error("[validate] Tests FAILED:\n" + output);
    return { success: false, message: "Tests failed:\n" + output.trim() };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// askQuestion(prompt) — generic readline prompt, returns trimmed string
// ─────────────────────────────────────────────────────────────────────────────
function askQuestion(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => { rl.close(); resolve(answer.trim()); });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// askConflictResolution(filePath, parentBranch, currentBranch)
//
// Interactive prompt shown once per conflicting file. Returns:
//   "ours"   — keep the AI branch version
//   "theirs" — keep the parent branch version
//   "manual" — leave conflict markers for hand-editing
// ─────────────────────────────────────────────────────────────────────────────
async function askConflictResolution(filePath, parentBranch, currentBranch) {
  console.log("\n" + "=".repeat(60));
  console.log("[conflict] File: " + filePath);
  console.log("=".repeat(60));
  console.log("  [1] Keep OURS   — keep AI branch version (" + currentBranch + ")");
  console.log("  [2] Keep THEIRS — keep parent version     (" + parentBranch + ")");
  console.log("  [3] Manual      — open file yourself and remove conflict markers");
  console.log("=".repeat(60));

  let answer = "";
  while (!["1", "2", "3"].includes(answer)) {
    answer = await askQuestion("  Your choice [1/2/3]: ");
    if (!["1", "2", "3"].includes(answer)) {
      console.log("  Invalid choice. Please enter 1, 2, or 3.");
    }
  }

  const map = { "1": "ours", "2": "theirs", "3": "manual" };
  const choice = map[answer];
  const label  = { ours: "Keep OURS (AI branch)", theirs: "Keep THEIRS (parent)", manual: "Manual resolve" }[choice];
  console.log("  -> " + label);
  return choice;
}

// ─────────────────────────────────────────────────────────────────────────────
// confirmWithUser(prompt) — yes/no prompt, returns boolean
// ─────────────────────────────────────────────────────────────────────────────
async function confirmWithUser(prompt) {
  const answer = await askQuestion("\n" + prompt + " [y/N]: ");
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

// ─────────────────────────────────────────────────────────────────────────────
// applyAIChange(task, applyChangesFn, options)
//
// options:
//   syncWithParent {boolean} Pull + merge parent before editing. Default: false
//   confirm        {boolean} Ask y/N before committing.          Default: false
//   validators     {Array}   Validator fns -> { success, message }
//   push           {boolean} Push branch to origin after success. Default: false
//
// Returns: { success, branch, commit, pushUrl?, parentPull?, error? }
// ─────────────────────────────────────────────────────────────────────────────
export async function applyAIChange(task, applyChangesFn, options = {}) {
  const {
    syncWithParent = false,
    confirm        = false,
    validators     = [runBuildValidator],
    push           = false,
  } = options;

  const branchName   = "ai-change-" + Date.now();
  let commitHash     = null;
  let branchCreated  = false;
  let parentPull     = null;

  console.log("\n" + "=".repeat(60));
  console.log("[agent] Starting AI task: " + task);
  console.log("=".repeat(60));

  const startBranch = await getCurrentBranch();
  if (PROTECTED_BRANCHES.includes(startBranch)) {
    console.log("[agent] On protected branch " + startBranch + ". A new AI branch will be created.");
  }

  try {
    // -- Step 0.5: Pull latest from parent ------------------------------------
    if (syncWithParent) {
      console.log("\n[agent] Step 0.5 - Syncing with parent branch...");
      const parentBranch = await getParentBranch();
      parentPull = await pullLatest(parentBranch);
      if (parentPull.before !== parentPull.after) {
        console.log("[agent] Pulled new commits from " + parentBranch);
      } else {
        console.log("[agent] " + parentBranch + " already up to date.");
      }
    } else {
      console.log("\n[agent] Step 0.5 - Skipped (syncWithParent=false).");
    }

    // -- Step 1: Create isolated AI branch ------------------------------------
    console.log("\n[agent] Step 1/6 - Creating branch: " + branchName);
    await createBranch(branchName);
    branchCreated = true;

    // -- Step 1.5: Merge parent into AI branch (interactive if conflicts) -----
    if (syncWithParent) {
      const parentBranch = await getParentBranch();
      console.log("\n[agent] Step 1.5 - Merging " + parentBranch + " into AI branch...");

      const mergeResult = await mergeWithInteractiveResolution(parentBranch, askConflictResolution);

      if (!mergeResult.completed) {
        // User chose "manual" for some files — merge is in-progress, paused
        console.log("\n[agent] Merge paused. " + mergeResult.manual.length + " file(s) need manual resolution:");
        for (const f of mergeResult.manual) console.log("         * " + f);
        console.log("\n[agent] Steps to resume:");
        console.log("  1. Open each conflicting file and remove <<<<<<< ======= >>>>>>> markers");
        console.log("  2. git add .");
        console.log("  3. git commit --no-edit");
        console.log("  4. Re-run this script");
        return {
          success: false,
          branch:  branchName,
          commit:  null,
          error:   "Merge paused: manual conflict resolution required in " + mergeResult.manual.join(", "),
          manual:  mergeResult.manual,
        };
      }

      if (mergeResult.resolved.length > 0) {
        console.log("[agent] Merge complete. Resolved " + mergeResult.resolved.length + " conflict(s):");
        for (const r of mergeResult.resolved) {
          console.log("         * " + r.file + " -> " + (r.resolution === "ours" ? "kept AI version" : "kept parent version"));
        }
      }
    }

    // -- Step 2: Apply AI changes ---------------------------------------------
    console.log("\n[agent] Step 2/6 - Applying AI changes...");
    await applyChangesFn(diffHelper);
    console.log("[agent] AI changes applied.");

    // -- Step 3: Diff preview -------------------------------------------------
    console.log("\n[agent] Step 3/6 - Diff preview:");
    await showDiff();

    // -- Step 4: Optional user confirmation -----------------------------------
    if (confirm) {
      console.log("\n[agent] Step 4/6 - Awaiting confirmation...");
      const approved = await confirmWithUser("Commit these changes for task: \"" + task + "\"?");
      if (!approved) {
        console.log("[agent] Rejected by user. Rolling back...");
        await rollback();
        return { success: false, branch: branchName, commit: null, error: "Rejected by user." };
      }
      console.log("[agent] User confirmed.");
    } else {
      console.log("\n[agent] Step 4/6 - Confirmation skipped.");
    }

    // -- Step 5: Commit -------------------------------------------------------
    console.log("\n[agent] Step 5/6 - Committing...");
    commitHash = await commitChanges(task);

    // -- Step 6: Validation pipeline ------------------------------------------
    console.log("\n[agent] Step 6/6 - Validation (" + validators.length + " validator(s))...");
    for (let i = 0; i < validators.length; i++) {
      const validator = validators[i];
      console.log("\n[agent]   Validator " + (i + 1) + "/" + validators.length + ": " + (validator.name || "anonymous"));
      const result = await validator();
      if (!result.success) {
        console.error("[agent] Validation FAILED: " + result.message);
        await rollback();
        return { success: false, branch: branchName, commit: null, error: "Validation failed: " + result.message };
      }
    }

    // -- Push (optional) -------------------------------------------------------
    let pushUrl;
    if (push) {
      console.log("\n[agent] Pushing branch...");
      await pushBranch(branchName);
      pushUrl = "origin/" + branchName;
    }

    console.log("\n" + "=".repeat(60));
    console.log("[agent] Done!");
    console.log("  Task:   " + task);
    console.log("  Branch: " + branchName);
    console.log("  Commit: " + commitHash);
    if (pushUrl)    console.log("  Remote: " + pushUrl);
    if (parentPull) console.log("  Parent: " + parentPull.branch + " (" + parentPull.before.slice(0, 7) + " -> " + parentPull.after.slice(0, 7) + ")");
    console.log("  Status: All " + validators.length + " validator(s) passed.");
    console.log("=".repeat(60) + "\n");

    return { success: true, branch: branchName, commit: commitHash, pushUrl, parentPull };

  } catch (err) {
    console.error("\n[agent] Error: " + err.message);
    if (branchCreated) {
      try { await rollback(); } catch (re) {
        console.error("[agent] Rollback also failed: " + re.message);
        console.error("[agent] Manual intervention needed. Branch: " + branchName);
      }
    }
    return { success: false, branch: branchName, commit: null, error: err.message };
  }
}

// USAGE EXAMPLES:
//
// Basic:
//   await applyAIChange("Update header", async (dh) => { /* edit files */ });
//
// With interactive conflict resolution:
//   await applyAIChange("Update header", async (dh) => { /* edit files */ }, {
//     syncWithParent: true,   // pull main, merge -> prompts user per conflicting file
//     confirm:        true,   // ask before committing
//     validators:     [runBuildValidator, runTestValidator],
//     push:           true,
//   });
//
// From CJS (server/agent.js):
//   const { applyAIChange } = await import("./git/agentWithGit.mjs");