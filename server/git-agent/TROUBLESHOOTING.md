# 🐛 Troubleshooting Guide

Common issues, causes, and solutions for the Git Agent.

## Quick Reference

| Issue | Cause | Solution |
|-------|-------|----------|
| API key invalid | Wrong or expired key | Check .env, regenerate key |
| Git command not found | Git not installed | Install git, add to PATH |
| Conflicts not detected | Merge doesn't create conflicts | Verify actual conflicts exist |
| Timeout errors | Network issues | Check connection, increase timeout |
| Build errors | Missing dependencies | Run `npm install` |
| Permission denied | Missing git credentials | Configure git credentials |
| No changes to commit | Repository clean | Make changes first |
| Memory error | Large diffs | Process smaller batches |

## Detailed Solutions

## 1. OpenAI API Issues

### "Invalid OpenAI API key"

**Symptoms**:
```
❌ Invalid OpenAI API key
Error: 401 Unauthorized
```

**Causes**:
- Incorrect API key format
- Expired or revoked key
- Key has insufficient permissions
- Typo in key

**Solutions**:
```bash
# Verify key format (should start with sk-)
echo $OPENAI_API_KEY

# Check .env file
cat .env

# Get new key from OpenAI dashboard
# https://platform.openai.com/api-keys

# Test API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### "Rate limit exceeded"

**Symptoms**:
```
429 Too Many Requests
```

**Causes**:
- Too many API calls
- Rate limit exceeded
- Concurrent requests

**Solutions**:
```typescript
// Agent automatically retries with backoff
// Adjust request frequency:
const config = {
  // ... other config
  apiCallsPerMinute: 30  // reduce from default
};

// Or wait before running again
setTimeout(() => {
  agent.executeWorkflow();
}, 60000); // Wait 1 minute
```

### "Request timeout"

**Symptoms**:
```
ECONNABORTED
```

**Causes**:
- Network connectivity issues
- API slow response
- Large diff being processed

**Solutions**:
```typescript
// Check network
ping api.openai.com

// Increase timeout
const config = {
  timeout: 30000  // 30 seconds instead of 10
};

// Try again later
await wait(5000);
await agent.commit();
```

## 2. Git Operation Issues

### "Repository path does not exist"

**Symptoms**:
```
ValidationError: Repository path does not exist
```

**Causes**:
- Wrong repository path
- Directory deleted
- Permission issues

**Solutions**:
```bash
# Check path exists
ls -la /path/to/repo

# Verify .env
cat .env | grep GIT_REPO_PATH

# Use correct path
export GIT_REPO_PATH=~/projects/my-repo
npm run cli workflow

# Check permissions
ls -la /path/to/repo/.git
```

### "Git command not found"

**Symptoms**:
```
spawn git ENOENT
```

**Causes**:
- Git not installed
- Git not in PATH
- Incorrect git binary

**Solutions**:
```bash
# Check git installation
git --version

# Install git (if needed)
# Windows: https://git-scm.com/download/win
# Mac: brew install git
# Linux: apt-get install git

# Check PATH
echo $PATH

# Add git to PATH
export PATH=$PATH:/usr/bin/git
```

### "Permission denied" on push

**Symptoms**:
```
Permission denied (publickey)
```

**Causes**:
- SSH key not configured
- SSH key not added to agent
- Wrong permissions on key

**Solutions**:
```bash
# Generate SSH key (if needed)
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa

# Add to ssh-agent
ssh-add ~/.ssh/id_rsa

# Test SSH connection
ssh -T git@github.com

# Fix key permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# Use HTTPS instead of SSH
git remote set-url origin https://github.com/user/repo.git
```

### "No changes to commit"

**Symptoms**:
```
Repository is clean
```

**Causes**:
- No actual file changes
- Already committed
- Tracked by .gitignore

**Solutions**:
```bash
# Check status
npm run cli status

# Make changes
echo "test" > newfile.txt

# Or force commit if needed
git commit --allow-empty -m "Empty commit"
```

### "Merge conflicts not detected"

**Symptoms**:
```
No conflicting files found
```

**Causes**:
- Pull didn't create conflicts
- Conflicts already resolved
- Fast-forward merge

**Solutions**:
```bash
# Verify merge is actually in progress
git status

# Check for actual conflicts
git diff --name-only --diff-filter=U

# Manually create conflict scenario
git merge origin/main --no-ff

# Review merge state
cat .git/MERGE_HEAD
```

## 3. Workflow Issues

### "Merge abort failed"

**Symptoms**:
```
Failed to abort merge
```

**Causes**:
- Corrupted git state
- Permission issues
- Incomplete merge

**Solutions**:
```bash
# Abort merge manually
git merge --abort

# Or force reset
git reset --hard HEAD

# Check git directory
ls -la .git/

# Recover using reflog
git reflog
git reset --hard <commit>
```

### "Stash not found"

**Symptoms**:
```
Stash not found
```

**Causes**:
- Stash reference invalid
- Manual stash deletion
- Git state corrupted

**Solutions**:
```bash
# List available stashes
git stash list

# Manually apply if exists
git stash apply stash@{0}

# Or recreate changes
git diff > changes.patch
git apply changes.patch

# Check git log
git reflog stash
```

### "Conflict resolution failed"

**Symptoms**:
```
ConflictResolutionError
```

**Causes**:
- File deleted in one branch
- Binary files conflicting
- Complex merge scenarios
- Insufficient permissions

**Solutions**:
```bash
# Resolve manually
npm run cli resolve-conflicts

# Or using git
git checkout --ours file.ts
git checkout --theirs file.ts

# Add resolved file
git add file.ts

# Complete merge
git commit -m "Merge resolved"
```

## 4. Configuration Issues

### "OPENAI_API_KEY not found"

**Symptoms**:
```
openaiApiKey is required
```

**Causes**:
- Missing .env file
- Wrong environment variable name
- Not exported

**Solutions**:
```bash
# Create .env file
cp .env.example .env

# Add your key
echo "OPENAI_API_KEY=sk_..." >> .env

# Or export directly
export OPENAI_API_KEY=sk_...

# Verify
echo $OPENAI_API_KEY
```

### "Invalid configuration"

**Symptoms**:
```
Configuration validation failed
```

**Causes**:
- Missing required fields
- Invalid values
- Type mismatches

**Solutions**:
```typescript
// Validate before use
const isValid = await agent.validateConfig();

if (!isValid) {
  console.error('Config invalid');
  // Run setup again
  cli.run(['config']);
}

// Check all required fields
const config = {
  repoPath: process.cwd(),        // ✅ Required
  baseBranch: 'main',             // ✅ Required
  openaiApiKey: process.env.OPENAI_API_KEY, // ✅ Required
  dryRun: false,                  // ✅ Required
  verbose: true,                  // ✅ Required
};
```

## 5. Build & Installation Issues

### "Cannot find module"

**Symptoms**:
```
Module not found
Cannot find typescript
```

**Causes**:
- Dependencies not installed
- TypeScript not compiled
- Wrong import path

**Solutions**:
```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Check tsconfig
cat tsconfig.json

# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### "TypeScript compilation errors"

**Symptoms**:
```
TS2307: Cannot find module
TS1192: Expected 1 arguments
```

**Causes**:
- Wrong TypeScript version
- Incompatible dependencies
- Type definition issues

**Solutions**:
```bash
# Check TypeScript version
npm list typescript

# Update if needed
npm install typescript@latest

# Clear cache
rm -rf dist

# Rebuild
npm run build

# Check for type errors
npx tsc --noEmit
```

## 6. Performance Issues

### "Workflow times out"

**Symptoms**:
```
ECONNABORTED
Timeout
```

**Causes**:
- Large repository
- Big diffs
- Slow network
- Slow API

**Solutions**:
```typescript
// Increase timeouts
const config = {
  timeout: 60000,  // 60 seconds
};

// Use dry-run to test
const config = {
  dryRun: true,
};

// Process in smaller batches
await agent.stageChanges(['file1.ts', 'file2.ts']);

// Monitor performance
const startTime = Date.now();
await agent.executeWorkflow();
console.log(`Took ${Date.now() - startTime}ms`);
```

### "High memory usage"

**Symptoms**:
```
Memory error
Out of memory
```

**Causes**:
- Very large diffs
- Many conflicts
- Unclosed resources
- Memory leak

**Solutions**:
```bash
# Monitor memory
npm install -g heapdump

# Analyze heap
node --inspect-brk src/cli/cli.ts

# Or process incrementally
# Stage files in smaller groups

# Clear logs periodically
rm git-agent.log

# Use Node memory settings
NODE_OPTIONS=--max-old-space-size=2048 npm run cli workflow
```

## 7. Logging & Debugging

### "Can't find logs"

**Solutions**:
```bash
# View current logs
cat git-agent.log

# Watch logs in real-time
tail -f git-agent.log

# Search for errors
grep ERROR git-agent.log

# Get last 100 lines
tail -100 git-agent.log

# Full history
less git-agent.log
```

### "Enable verbose logging"

```typescript
const config = {
  verbose: true,  // Enable detailed logs
};

// Or CLI
npm run cli config  # Set verbose=true
```

### "Debug mode"

```bash
# Run with full debugging
DEBUG=* npm run cli workflow

# Or for TypeScript
npm run dev

# With Node debugger
node --inspect-brk dist/cli/cli.js
```

## 8. Network Issues

### "Connection refused"

**Symptoms**:
```
ECONNREFUSED
```

**Causes**:
- Git server down
- Network disconnected
- Firewall blocking
- Proxy issues

**Solutions**:
```bash
# Test connectivity
ping github.com
ping api.openai.com

# Check git remote
git remote -v

# Test git connection
git ls-remote origin

# Check firewall/proxy
curl -I https://github.com

# Configure proxy if needed
git config --global http.proxy http://proxy:port
```

## 9. Dry-Run Issues

### "Dry-run not working"

**Solutions**:
```bash
# Verify DRY_RUN is set
echo $DRY_RUN

# Check config
cat .env | grep DRY_RUN

# Test dry-run explicitly
npm run cli config  # Set DRY_RUN=true

# Or programmatically
const config = { dryRun: true };
```

## 10. Recovery Procedures

### "Need to undo changes"

```bash
# Check recent commits
git log --oneline -5

# Undo last commit
git reset --soft HEAD~1

# Or use reflog
git reflog
git reset --hard <commit>
```

### "Repository in bad state"

```bash
# Check status
git status

# Clean up
git clean -fd

# Reset to last remote
git fetch origin
git reset --hard origin/main

# Or abort any in-progress operations
git merge --abort
git rebase --abort
```

### "Need full recovery"

```bash
# Backup current repo
cp -r repo repo.backup

# Reset to clean state
rm -rf .git
git init
git remote add origin <url>
git fetch origin
git reset --hard origin/main
```

## Getting Help

### Check Logs
```bash
tail -f git-agent.log
```

### Verify Setup
```bash
npm run cli config
```

### Test Connection
```bash
ssh -T git@github.com
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Review Documentation
- [README.md](./README.md) - Overview
- [API.md](./API.md) - API Reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System Design

### Common Commands

```bash
# Status check
npm run cli status

# Configuration
npm run cli config

# Manual conflict resolution
npm run cli resolve-conflicts

# View logs
cat git-agent.log | tail -50

# Clean build
npm run clean && npm install && npm run build

# Full workflow test (dry-run)
DRY_RUN=true npm run cli workflow
```

---

**Still stuck?**

1. Check logs: `tail -f git-agent.log`
2. Enable verbose: Set `verbose: true` in config
3. Test dry-run: `DRY_RUN=true npm run cli workflow`
4. Reset repo: Backup and `git reset --hard origin/main`
5. Reinstall: `npm run clean && npm install && npm run build`

**Last resort**: Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system internals.
