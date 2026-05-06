/**
 * gitService.mjs
 * Low-level Git operations for the AI agent workflow.
 */

import simpleGit from "simple-git";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "../../");
const PROTECTED_BRANCHES = ["main", "master"];
const git = simpleGit(PROJECT_ROOT);

export async function getCurrentBranch() {
  const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
  return branch.trim();
}

export async function createBranch(branchName) {
  console.log("\n[git] Creating branch: " + branchName);
  const { all: existingBranches } = await git.branchLocal();
  if (existingBranches.includes(branchName)) throw new Error("[git] Branch already exists: " + branchName);
  await git.checkoutLocalBranch(branchName);
  console.log("[git] Switched to: " + branchName);
  return branchName;
}

export async function commitChanges(description) {
  const currentBranch = await getCurrentBranch();
  if (PROTECTED_BRANCHES.includes(currentBranch)) throw new Error("[git] Refusing to commit on protected branch: " + currentBranch);
  console.log("\n[git] Staging all changes...");
  await git.add("-A");
  const status = await git.status();
  if (status.isClean()) { console.log("[git] Nothing to commit."); return null; }
  const msg = "AI: " + description;
  console.log("[git] Committing: " + msg);
  const result = await git.commit(msg);
  console.log("[git] Committed: " + result.commit + " on " + currentBranch);
  return result.commit;
}

export async function rollback() {
  const currentBranch = await getCurrentBranch();
  console.log("\n[git] Rolling back on: " + currentBranch);
  if (PROTECTED_BRANCHES.includes(currentBranch)) throw new Error("[git] Rollback refused on: " + currentBranch);
  try { await git.revparse(["HEAD~1"]); } catch {
    await git.checkout(["."]);
    await git.clean("fd");
    await checkoutMain();
    return;
  }
  await git.reset(["--hard", "HEAD~1"]);
  console.log("[git] Last commit undone.");
  await checkoutMain();
}

export async function showDiff() {
  console.log("\n[git] Diff Preview:");
  const combined = ((await git.diff(["--cached"])) + (await git.diff())).trim();
  if (!combined) { console.log("[git] No changes."); return; }
  for (const line of combined.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) process.stdout.write("\x1b[32m" + line + "\x1b[0m\n");
    else if (line.startsWith("-") && !line.startsWith("---")) process.stdout.write("\x1b[31m" + line + "\x1b[0m\n");
    else if (line.startsWith("@@")) process.stdout.write("\x1b[36m" + line + "\x1b[0m\n");
    else console.log(line);
  }
}

export async function pushBranch(branchName) {
  console.log("\n[git] Pushing " + branchName + " to origin...");
  await git.push("origin", branchName, ["--set-upstream"]);
  console.log("[git] Branch published: " + branchName);
}

export async function getParentBranch() {
  const current = await getCurrentBranch();
  if (PROTECTED_BRANCHES.includes(current)) return current;
  for (const candidate of PROTECTED_BRANCHES) {
    const { all: lb } = await git.branchLocal();
    if (!lb.includes(candidate)) continue;
    try {
      const base = await git.raw(["merge-base", current, candidate]);
      if (base.trim()) { console.log("[git] Parent: " + candidate); return candidate; }
    } catch { /* skip */ }
  }
  const { all: lb } = await git.branchLocal();
  const fallback = lb.includes("main") ? "main" : "master";
  console.log("[git] Parent fallback: " + fallback);
  return fallback;
}

export async function pullLatest(branch) {
  const orig = await getCurrentBranch();
  console.log("\n[git] Pulling from origin/" + branch + "...");
  if (orig !== branch) await git.checkout(branch);
  const before = await git.revparse(["HEAD"]);
  try { await git.pull("origin", branch, ["--ff-only"]); } catch (err) {
    if (orig !== branch) await git.checkout(orig);
    throw new Error("[git] Pull failed - branches diverged. Fix: git pull --rebase origin " + branch + "\n" + err.message);
  }
  const after = await git.revparse(["HEAD"]);
  console.log("[git] " + branch + " up to date. New commits: " + (before.trim() === after.trim() ? 0 : ">=1"));
  if (orig !== branch) { await git.checkout(orig); console.log("[git] Returned to: " + orig); }
  return { branch, before: before.trim(), after: after.trim() };
}

// mergeParentIntoBranch - non-interactive, aborts and throws on conflict
export async function mergeParentIntoBranch(parentBranch) {
  const current = await getCurrentBranch();
  console.log("\n[git] Merging " + parentBranch + " into " + current + "...");
  try {
    await git.merge([parentBranch, "--no-edit"]);
    console.log("[git] Merge clean."); return { conflicts: [] };
  } catch (mergeErr) {
    const status = await git.status();
    const conflictFiles = status.conflicted;
    if (conflictFiles.length === 0) {
      if (mergeErr.message && mergeErr.message.includes("Already up to date")) { console.log("[git] Already up to date."); return { conflicts: [] }; }
      throw mergeErr;
    }
    console.error("[git] Conflict in " + conflictFiles.length + " file(s):");
    for (const f of conflictFiles) console.error("       * " + f);
    await git.merge(["--abort"]);
    throw Object.assign(new Error("Merge conflict in: " + conflictFiles.join(", ")), { conflicts: conflictFiles });
  }
}

// mergeWithInteractiveResolution - asks user how to resolve each conflict
// resolveFileFn(filePath, parentBranch, currentBranch) => Promise<"ours"|"theirs"|"manual">
//   "ours"   -> git checkout --ours <file>   (keep AI branch version)
//   "theirs" -> git checkout --theirs <file> (keep parent version)
//   "manual" -> leave conflict markers; merge stays in-progress
// Returns { conflicts, resolved, manual, completed }
export async function mergeWithInteractiveResolution(parentBranch, resolveFileFn) {
  const current = await getCurrentBranch();
  console.log("\n[git] Merging " + parentBranch + " into " + current + "...");

  try {
    await git.merge([parentBranch, "--no-edit"]);
    console.log("[git] Merge clean - no conflicts.");
    return { conflicts: [], resolved: [], manual: [], completed: true };
  } catch (mergeErr) {
    const status = await git.status();
    const conflictFiles = status.conflicted;

    if (conflictFiles.length === 0) {
      if (mergeErr.message && mergeErr.message.includes("Already up to date")) {
        console.log("[git] Already up to date."); return { conflicts: [], resolved: [], manual: [], completed: true };
      }
      throw mergeErr;
    }

    console.log("\n[git] " + conflictFiles.length + " conflict(s) found. Asking user...");
    const resolved = [];
    const manual = [];

    for (const filePath of conflictFiles) {
      const choice = await resolveFileFn(filePath, parentBranch, current);

      if (choice === "ours") {
        // Keep the AI branch version - discard parent changes for this file
        await git.checkout(["--ours", filePath]);
        await git.add([filePath]);
        resolved.push({ file: filePath, resolution: "ours" });
        console.log("[git] " + filePath + " -> OURS (AI branch version kept)");

      } else if (choice === "theirs") {
        // Keep the parent branch version - discard AI changes for this file
        await git.checkout(["--theirs", filePath]);
        await git.add([filePath]);
        resolved.push({ file: filePath, resolution: "theirs" });
        console.log("[git] " + filePath + " -> THEIRS (" + parentBranch + " version kept)");

      } else {
        // manual - leave conflict markers, do NOT stage
        manual.push(filePath);
        console.log("[git] " + filePath + " -> left for manual resolution");
      }
    }

    if (manual.length > 0) {
      // Merge is LEFT IN-PROGRESS (not aborted) so markers remain editable
      console.log("\n[git] Merge paused. " + manual.length + " file(s) need manual editing:");
      for (const f of manual) console.log("       * " + f);
      console.log("\n[git] Steps to complete:");
      console.log("       1. Open each file and remove <<<<<<< ======= >>>>>>> markers");
      console.log("       2. git add .");
      console.log("       3. git commit --no-edit");
      return { conflicts: conflictFiles, resolved, manual, completed: false };
    }

    // All choices made - finalize the merge commit
    console.log("\n[git] All conflicts resolved. Completing merge...");
    await git.commit(["--no-edit"]);
    console.log("[git] Merge committed.");
    return { conflicts: conflictFiles, resolved, manual: [], completed: true };
  }
}

async function checkoutMain() {
  const { all: branches } = await git.branchLocal();
  const target = branches.includes("main") ? "main" : "master";
  await git.checkout(target);
  console.log("[git] Returned to: " + target);
}