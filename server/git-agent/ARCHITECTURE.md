# 🏗️ System Architecture

Deep dive into the Git Agent's design, components, and internal workings.

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                     │
│  ┌────────────┐  ┌──────────┐  ┌────────────┐  ┌────────┐ │
│  │   CLI      │  │  REST    │  │ Chat Agent │  │ Direct │ │
│  │ Interface  │  │   API    │  │ Integration│  │  Code  │ │
│  └────────────┘  └──────────┘  └────────────┘  └────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Git Agent Integration Layer                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          GitAgentIntegration (High-level API)       │  │
│  │  - initialize()  - stageChanges()                   │  │
│  │  - executeWorkflow()  - commit()  - push()          │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Orchestration Layer                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          GitAgent (Main Orchestrator)               │  │
│  │  - Coordinates all services                         │  │
│  │  - Manages workflow state                           │  │
│  │  - Handles rollback logic                           │  │
│  │  - Logs operations                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬────────────────┬──────────────────┬─────────────────┘
         │                │                  │
    ┌────▼────┐     ┌─────▼──────┐    ┌─────▼──────┐
    │          │     │            │    │            │
┌───▼──────────▼──┬──▼────────────▼───▼────────────┐
│     Service Layer                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐  ┌───────────────┐           │
│  │ GitService   │  │  AIService    │           │
│  ├──────────────┤  ├───────────────┤           │
│  │ - stage()    │  │ - generate    │           │
│  │ - commit()   │  │   Message()   │           │
│  │ - pull()     │  │ - validate    │           │
│  │ - push()     │  │   Key()       │           │
│  │ - conflict   │  │ - analyze()   │           │
│  │   ops()      │  │               │           │
│  └──────────────┘  └───────────────┘           │
│                                                 │
│  ┌────────────────────────┐                    │
│  │ ConflictResolver       │                    │
│  ├────────────────────────┤                    │
│  │ - parseMarkers()       │                    │
│  │ - resolveKeepCurrent() │                    │
│  │ - resolveAcceptIncoming│                    │
│  │ - autoMerge()          │                    │
│  │ - displayContext()     │                    │
│  └────────────────────────┘                    │
│                                                 │
└─────────────────────────────────────────────────┘
         │                     │
    ┌────▼─────────────────────▼───────┐
    │       Utility Layer               │
    ├──────────────────────────────────┤
    │ - Logger (colored output)        │
    │ - Error Classes                  │
    │ - Type Definitions               │
    └──────────────────────────────────┘
         │                     │
    ┌────▼─────────────────────▼───────┐
    │      External Dependencies       │
    ├──────────────────────────────────┤
    │ - simple-git (Git operations)    │
    │ - axios (HTTP requests)          │
    │ - inquirer (CLI prompts)         │
    │ - chalk (Colored output)         │
    │ - OpenAI API (AI generation)     │
    └──────────────────────────────────┘
```

## Component Details

### 1. GitService (600+ lines)

**Responsibility**: All Git-related operations

**Key Methods**:
- `getStatus()` - Repository status
- `stage(files?)` - Staging changes
- `commit(message, dryRun?)` - Create commits
- `pull(branch, dryRun?)` - Pull from parent
- `push(dryRun?)` - Push to remote
- `hasConflicts()` - Detect conflicts
- `getConflictingFiles()` - List conflicts
- `resolveConflict(path, strategy)` - Resolve
- `stash(message?)` - Create stash (for rollback)

**Dependencies**:
- `simple-git` - Git command wrapper
- `fs` - File system operations
- Logger, Error classes

**Data Flow**:
```
Git Commands → simple-git → GitService → Result
```

### 2. AIService (400+ lines)

**Responsibility**: OpenAI integration and AI features

**Key Methods**:
- `generateCommitMessage(diff, branch?)` - Generate commits
- `validateApiKey()` - Verify API key
- `analyzeChanges(diff)` - Code analysis

**Features**:
- Retry logic with exponential backoff
- Rate limiting handling
- Fallback generation
- Token optimization

**Dependencies**:
- `axios` - HTTP requests
- OpenAI API

**Error Handling**:
- API key validation
- Rate limit recovery
- Timeout handling
- Fallback generation

### 3. ConflictResolver (400+ lines)

**Responsibility**: Intelligent conflict resolution

**Key Methods**:
- `parseConflictMarkers(content)` - Parse markers
- `parseConflictingFile(path)` - Parse file
- `resolveKeepCurrent(path)` - Keep current
- `resolveAcceptIncoming(path)` - Accept incoming
- `resolveManual(path, content)` - Manual merge
- `autoMergeConflicts(conflicts)` - Auto-merge
- `displayConflictContext(conflict)` - Show conflicts

**Conflict Parsing**:
```
Content with markers
    ↓
Parse markers
    ↓
Extract current & incoming
    ↓
Store conflict info
    ↓
Display or resolve
```

**Resolution Strategies**:
1. **Keep Current** - Remove incoming markers
2. **Accept Incoming** - Remove current markers
3. **Manual** - User provides content
4. **Auto-Merge** - Heuristic-based

### 4. GitAgent (400+ lines)

**Responsibility**: Orchestrate entire workflow

**Workflow**:
```
1. Stage Changes
     ↓
2. Pull from Parent
     ↓
3. Detect Conflicts
     ├─ Yes → Resolve Conflicts
     └─ No → Continue
     ↓
4. Generate & Commit
     ↓
5. Push to Remote
     ↓
6. Log Results
```

**State Management**:
- Tracks operation logs
- Manages stash references
- Handles change state
- Maintains rollback info

**Error Recovery**:
- Stash creation before pull
- Merge abort on error
- Stash reapplication
- Detailed error logging

### 5. Logger (300+ lines)

**Responsibility**: Colored, file-based logging

**Features**:
- Multiple log levels
- Color output
- File logging
- Section headers
- Timestamped entries

**Log Levels**:
- DEBUG (dim)
- INFO (cyan)
- WARN (yellow)
- ERROR (red)
- SUCCESS (green)

### 6. CLI (400+ lines)

**Responsibility**: Interactive command-line interface

**Features**:
- Interactive prompts (inquirer)
- Command routing
- Configuration setup
- Manual conflict resolution
- Colored output (chalk)

**Commands**:
- `workflow` - Execute full workflow
- `status` - Show repo status
- `resolve-conflicts` - Manual resolution
- `config` - Setup configuration
- `help` - Show help

## Data Flow

### Complete Workflow Flow

```
User Input
    │
    ▼
┌─────────────────────────────┐
│ Parse & Validate Input      │
└────────┬────────────────────┘
         │
    ┌────▼──────────────────┐
    │ GitAgent              │
    │ executeFullWorkflow() │
    └────┬───────────────────┘
         │
    ┌────▼──────────────────┐
    │ 1. Stage Changes      │
    │ gitService.stage()    │
    └────┬───────────────────┘
         │
    ┌────▼──────────────────┐
    │ 2. Pull from Parent   │
    │ gitService.pull()     │
    └────┬───────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ 3. Check Conflicts            │
    │ gitService.hasConflicts()     │
    └────┬────────┬─────────────────┘
         │        │
    YES  │        │ NO
    ┌────▼─┐   ┌──▼────┐
    │      │   │       │
    └────┬─┘   │       │
         │     │       │
    ┌────▼─────▼───┐   │
    │ 4. Resolve   │   │
    │ Conflicts    │   │
    └────┬─────────┘   │
         │             │
         └─────┬───────┘
               │
         ┌─────▼───────────────┐
         │ 5. Get Diff         │
         │ gitService.getDiff()│
         └─────┬───────────────┘
               │
         ┌─────▼──────────────────┐
         │ 6. Generate Message    │
         │ aiService.generate...()│
         └─────┬──────────────────┘
               │
         ┌─────▼──────────────────┐
         │ 7. Create Commit       │
         │ gitService.commit()    │
         └─────┬──────────────────┘
               │
         ┌─────▼──────────────────┐
         │ 8. Push to Remote      │
         │ gitService.push()      │
         └─────┬──────────────────┘
               │
         ┌─────▼──────────────────┐
         │ 9. Log Operations      │
         │ return result          │
         └────────────────────────┘
```

## Error Handling Architecture

```
┌──────────────────────────────┐
│  Exception Thrown            │
└────────────┬─────────────────┘
             │
    ┌────────▼─────────┐
    │ Error Type?      │
    └────┬─────────┬──────────┐
         │         │          │
    ┌────▼─┐  ┌───▼───┐  ┌───▼──────┐
    │GitOp │  │Conflict│  │AIService │
    │Error │  │Error   │  │Error     │
    └────┬─┘  └───┬───┘  └───┬──────┘
         │        │          │
    ┌────▼────────▼──────────▼────┐
    │ Log Error with Context      │
    └────┬───────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ Attempt Rollback          │
    │ - Abort merge if in       │
    │   progress                │
    │ - Apply stash if exists   │
    └────┬────────────────────┬─┘
         │                    │
    SUCCESS              FAILURE
         │                    │
    ┌────▼────┐          ┌────▼────┐
    │Clean    │          │Report   │
    │State    │          │Failure  │
    └─────────┘          └─────────┘
```

## Type System

```typescript
// Core Types
interface AgentConfig {
  repoPath: string;
  baseBranch: string;
  openaiApiKey: string;
  dryRun: boolean;
  verbose: boolean;
  autoResolveStrategy?: 'keep-current' | 'accept-incoming';
}

interface AgentResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  rollbackAvailable?: boolean;
}

// Service Types
interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isDirty: boolean;
}

interface ConflictFile {
  path: string;
  currentBranchContent: string;
  parentBranchContent: string;
  conflictMarkers: ConflictMarker[];
}

interface DiffInfo {
  filesChanged: number;
  insertions: number;
  deletions: number;
  diff: string;
}

// Utility Types
class GitAgentError extends Error {}
class GitOperationError extends GitAgentError {}
class ConflictResolutionError extends GitAgentError {}
class AIServiceError extends GitAgentError {}
```

## Performance Characteristics

### Time Complexity
- Status check: O(1)
- Staging: O(n) where n = files
- Diff analysis: O(d) where d = diff size
- Conflict parsing: O(m) where m = conflicts
- AI generation: O(1) - external API

### Space Complexity
- Stash storage: O(1) - single reference
- Diff content: O(d) - proportional to changes
- Conflict context: O(m) - proportional to conflicts

### Typical Latencies
```
Stage:     50-100ms
Status:    100-200ms
Diff:      200-500ms
AI Gen:    2-5s (external)
Full:      10-30s typical
```

## Design Patterns

### 1. Service Pattern
Each service encapsulates specific domain:
- GitService for Git
- AIService for AI
- ConflictResolver for conflicts

### 2. Orchestrator Pattern
GitAgent coordinates between services without tight coupling.

### 3. Logger Pattern
Centralized logging with multiple outputs (console, file).

### 4. Error Chain Pattern
Custom errors with context preservation.

### 5. Dry-Run Pattern
All operations support dry-run mode.

### 6. Stash Pattern
Backup mechanism using git stash.

## Security Considerations

### API Key Management
- Never logged
- Loaded from environment
- Validated at startup
- Timeout on requests

### File Operations
- Validated file paths
- Checked before write
- Atomic operations
- Error recovery

### Git Operations
- Executed via simple-git
- Command injection prevention
- Standard streams isolated
- Error output sanitized

## Testing Strategy

```
Unit Tests
├── GitService tests
├── AIService tests
├── ConflictResolver tests
└── Logger tests

Integration Tests
├── Full workflow
├── Conflict scenarios
├── Error recovery
└── Rollback mechanisms

E2E Tests
├── CLI usage
├── API endpoints
└── Real git operations
```

## Future Enhancements

### Phase 2
- [ ] Web dashboard
- [ ] Multi-branch support
- [ ] Webhook integrations
- [ ] Custom templates

### Phase 3
- [ ] Advanced analytics
- [ ] Machine learning insights
- [ ] Team collaboration
- [ ] Audit logging

### Phase 4
- [ ] Plugin system
- [ ] Enterprise features
- [ ] Advanced security
- [ ] Performance optimizations

## References

- [Simple-Git Documentation](https://github.com/steveukx/git-js)
- [OpenAI API Guide](https://platform.openai.com/docs/guides/gpt)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Git Internals](https://git-scm.com/book/en/v2/Git-Internals)

---

See [README.md](./README.md) for overview or [API.md](./API.md) for API reference.
