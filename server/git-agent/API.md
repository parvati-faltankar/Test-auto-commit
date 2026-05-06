# API Reference

## GitService

Handles all Git operations.

### Methods

#### `getStatus(): Promise<GitStatus>`
Get current repository status.

```typescript
interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isDirty: boolean;
}
```

#### `stage(files?: string[]): Promise<void>`
Stage all changes or specific files.

```typescript
// Stage all
await gitService.stage();

// Stage specific files
await gitService.stage(['src/file.ts', 'README.md']);
```

#### `commit(message: string, dryRun?: boolean): Promise<CommitInfo | null>`
Commit staged changes.

```typescript
interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
}

const commit = await gitService.commit('Fix: bug in auth');
```

#### `getDiff(cached?: boolean): Promise<DiffInfo>`
Get diff of staged or unstaged changes.

```typescript
interface DiffInfo {
  filesChanged: number;
  insertions: number;
  deletions: number;
  diff: string;
}

const diff = await gitService.getDiff(true); // staged
```

#### `pull(parentBranch: string, dryRun?: boolean): Promise<void>`
Pull changes from parent branch.

```typescript
await gitService.pull('main');
```

#### `push(dryRun?: boolean): Promise<void>`
Push changes to remote.

```typescript
await gitService.push();
```

#### `hasConflicts(): Promise<boolean>`
Check if there are merge conflicts.

```typescript
const hasConflicts = await gitService.hasConflicts();
```

#### `getConflictingFiles(): Promise<string[]>`
Get list of conflicting files.

```typescript
const files = await gitService.getConflictingFiles();
// ['src/app.ts', 'README.md']
```

#### `readFile(filePath: string): Promise<string>`
Read file content.

```typescript
const content = await gitService.readFile('src/app.ts');
```

#### `writeFile(filePath: string, content: string): Promise<void>`
Write file content.

```typescript
await gitService.writeFile('src/app.ts', newContent);
```

#### `getCommitLog(limit?: number): Promise<CommitInfo[]>`
Get recent commit history.

```typescript
const commits = await gitService.getCommitLog(10);
```

#### `getCurrentBranch(): Promise<string>`
Get current branch name.

```typescript
const branch = await gitService.getCurrentBranch();
// 'main'
```

#### `stash(message?: string): Promise<string>`
Create a stash for rollback.

```typescript
const stashRef = await gitService.stash('backup');
// 'stash@{0}'
```

#### `applyStash(stashRef: string): Promise<void>`
Apply a stash.

```typescript
await gitService.applyStash('stash@{0}');
```

#### `abortMerge(): Promise<void>`
Abort an in-progress merge.

```typescript
await gitService.abortMerge();
```

#### `resolveConflict(filePath: string, strategy: 'ours' | 'theirs'): Promise<void>`
Resolve conflict with strategy.

```typescript
await gitService.resolveConflict('src/app.ts', 'ours');
```

---

## AIService

Generates commit messages using OpenAI.

### Methods

#### `generateCommitMessage(diff: DiffInfo, branchName?: string): Promise<string>`
Generate AI commit message based on diff.

```typescript
const message = await aiService.generateCommitMessage(diff, 'feature-branch');
// 'Add user authentication module'
```

#### `validateApiKey(): Promise<boolean>`
Validate OpenAI API key.

```typescript
const isValid = await aiService.validateApiKey();
```

#### `analyzeChanges(diff: string): Promise<string[]>`
Analyze code for suggestions.

```typescript
const suggestions = await aiService.analyzeChanges(largeDiff);
// ['Consider adding type guards', 'Add error handling']
```

---

## ConflictResolver

Handles merge conflict resolution.

### Methods

#### `parseConflictMarkers(content: string): ConflictMarker[]`
Parse conflict markers in file content.

```typescript
interface ConflictMarker {
  startLine: number;
  endLine: number;
  currentContent: string;
  incomingContent: string;
}

const markers = conflictResolver.parseConflictMarkers(fileContent);
```

#### `parseConflictingFile(filePath: string): Promise<ConflictFile>`
Parse a conflicting file.

```typescript
interface ConflictFile {
  path: string;
  currentBranchContent: string;
  parentBranchContent: string;
  conflictMarkers: ConflictMarker[];
}

const conflict = await conflictResolver.parseConflictingFile('src/app.ts');
```

#### `resolveKeepCurrent(filePath: string): Promise<void>`
Keep current branch content.

```typescript
await conflictResolver.resolveKeepCurrent('src/app.ts');
```

#### `resolveAcceptIncoming(filePath: string): Promise<void>`
Accept incoming changes.

```typescript
await conflictResolver.resolveAcceptIncoming('src/app.ts');
```

#### `resolveManual(filePath: string, resolvedContent: string): Promise<void>`
Apply manual resolution.

```typescript
await conflictResolver.resolveManual('src/app.ts', manuallyMergedContent);
```

#### `displayConflictContext(conflict: ConflictFile): void`
Display conflict in terminal.

```typescript
conflictResolver.displayConflictContext(conflict);
// Displays formatted conflict
```

#### `getMergeConflictContext(...): Promise<MergeConflictContext>`
Get full merge context.

```typescript
interface MergeConflictContext {
  totalConflicts: number;
  conflictFiles: ConflictFile[];
  baseBranch: string;
  currentBranch: string;
}

const context = await conflictResolver.getMergeConflictContext(
  files,
  'main',
  'feature-branch'
);
```

#### `autoMergeConflicts(conflicts: ConflictFile[]): Promise<string[]>`
Auto-resolve conflicts.

```typescript
const resolved = await conflictResolver.autoMergeConflicts(conflicts);
// ['src/app.ts', 'src/utils.ts']
```

---

## GitAgent

Main orchestrator service.

### Methods

#### `executeFullWorkflow(): Promise<AgentResult>`
Execute complete workflow.

```typescript
interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  rollbackAvailable?: boolean;
}

const result = await gitAgent.executeFullWorkflow();
```

#### `validateConfig(): Promise<boolean>`
Validate configuration.

```typescript
const isValid = await gitAgent.validateConfig();
```

#### `getStatus(): Promise<any>`
Get repository status with recent commits.

```typescript
const status = await gitAgent.getStatus();
```

#### `getOperationLogs(): OperationLog[]`
Get operation history.

```typescript
interface OperationLog {
  timestamp: Date;
  operation: string;
  status: 'started' | 'completed' | 'failed' | 'rolledback';
  details: string;
}

const logs = gitAgent.getOperationLogs();
```

---

## GitAgentIntegration

High-level integration interface.

### Methods

#### `initialize(config: AgentConfig): void`
Initialize the agent.

```typescript
integration.initialize({
  repoPath: process.cwd(),
  baseBranch: 'main',
  openaiApiKey: process.env.OPENAI_API_KEY!,
  dryRun: false,
  verbose: true,
});
```

#### `stageChanges(files?: string[]): Promise<AgentResult>`
Stage changes.

```typescript
const result = await integration.stageChanges(['src/app.ts']);
```

#### `pullFromParent(): Promise<AgentResult>`
Pull from parent branch.

```typescript
const result = await integration.pullFromParent();
```

#### `checkForConflicts(): Promise<AgentResult>`
Check for merge conflicts.

```typescript
const result = await integration.checkForConflicts();
```

#### `commit(customMessage?: string): Promise<AgentResult>`
Commit changes.

```typescript
const result = await integration.commit();
// or
const result = await integration.commit('Custom message');
```

#### `push(): Promise<AgentResult>`
Push to remote.

```typescript
const result = await integration.push();
```

#### `executeWorkflow(): Promise<AgentResult>`
Execute full workflow.

```typescript
const result = await integration.executeWorkflow();
```

#### `getStatus(): Promise<AgentResult>`
Get status.

```typescript
const result = await integration.getStatus();
```

#### `validateConfig(): Promise<boolean>`
Validate config.

```typescript
const isValid = await integration.validateConfig();
```

---

## Types

### AgentConfig

```typescript
interface AgentConfig {
  repoPath: string;
  baseBranch: string;
  openaiApiKey: string;
  dryRun: boolean;
  verbose: boolean;
  autoResolveStrategy?: 'keep-current' | 'accept-incoming';
}
```

### AgentResult

```typescript
interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  rollbackAvailable?: boolean;
}
```

### ConflictFile

```typescript
interface ConflictFile {
  path: string;
  currentBranchContent: string;
  parentBranchContent: string;
  conflictMarkers: ConflictMarker[];
}
```

### CommitInfo

```typescript
interface CommitInfo {
  hash: string;
  author: string;
  date: Date;
  message: string;
}
```

### DiffInfo

```typescript
interface DiffInfo {
  filesChanged: number;
  insertions: number;
  deletions: number;
  diff: string;
}
```

---

## Error Handling

### Error Classes

- `GitAgentError` - Base error class
- `GitOperationError` - Git command failed
- `ConflictResolutionError` - Conflict resolution failed
- `AIServiceError` - OpenAI API error
- `ValidationError` - Configuration invalid
- `RollbackError` - Rollback operation failed

### Example

```typescript
try {
  await gitAgent.executeFullWorkflow();
} catch (error) {
  if (error instanceof GitOperationError) {
    console.error('Git error:', error.message);
  } else if (error instanceof AIServiceError) {
    console.error('AI error:', error.message);
  }
}
```

---

## Logger

```typescript
const logger = new Logger({
  color: true,
  toFile: true,
  filePath: './git-agent.log'
});

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
logger.success('Success message');
logger.section('Section title');
```

---

For more examples, see [README.md](./README.md#examples).
