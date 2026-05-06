/**
 * commitChange.mjs
 * One-shot script: commit whatever is currently changed on disk using the
 * AI git lifecycle (branch → stage → commit → build validate → rollback on fail).
 *
 * Usage:
 *   node server/git/commitChange.mjs
 */

import { applyAIChange, runBuildValidator } from './agentWithGit.mjs';

const TASK = 'Update ChatAssistant page';

const result = await applyAIChange(
  TASK,
  async () => {
    // Files already edited on disk — nothing to write here.
    // applyAIChange will stage everything via git add -A.
  },
  {
    confirm:    false,               // non-interactive: commit without prompting
    validators: [runBuildValidator], // run npm run build; rollback if it fails
    push:       true,                // publish branch to origin after success
  }
);

process.exit(result.success ? 0 : 1);
