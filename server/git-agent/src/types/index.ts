/**
 * Type definitions for Git Agent
 */

export interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isDirty: boolean;
}

export interface ConflictFile {
  path: string;
  currentBranchContent: string;
  parentBranchContent: string;
  conflictMarkers: ConflictMarker[];
}

export interface ConflictMarker {
  startLine: number;
  endLine: number;
  currentContent: string;
  incomingContent: string;
}

export interface ConflictResolution {
  filePath: string;
  strategy: 'keep-current' | 'accept-incoming' | 'manual' | 'auto-merge';
  resolvedContent?: string;
}

export interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

export interface DiffInfo {
  filesChanged: number;
  insertions: number;
  deletions: number;
  diff: string;
}

export interface AgentConfig {
  repoPath: string;
  baseBranch: string;
  openaiApiKey: string;
  dryRun: boolean;
  verbose: boolean;
  autoResolveStrategy?: 'keep-current' | 'accept-incoming';
}

export interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  rollbackAvailable?: boolean;
}

export interface MergeConflictContext {
  totalConflicts: number;
  conflictFiles: ConflictFile[];
  baseBranch: string;
  currentBranch: string;
}

export interface OperationLog {
  timestamp: Date;
  operation: string;
  status: 'started' | 'completed' | 'failed' | 'rolledback';
  details: string;
  rollbackCommand?: string;
}
