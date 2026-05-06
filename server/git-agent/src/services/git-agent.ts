/**
 * Main Git Agent - Orchestrates all git operations
 */

import Logger from '../utils/logger';
import { GitService } from './git.service';
import { AIService } from './ai.service';
import { ConflictResolver } from './conflict-resolver';
import { AgentConfig, AgentResult, OperationLog } from '../types';
import { GitAgentError, RollbackError } from '../utils/errors';
import { execSync } from 'child_process';
import fs from 'fs';

export class GitAgent {
  private config: AgentConfig;
  private logger: Logger;
  private gitService: GitService;
  private aiService: AIService;
  private conflictResolver: ConflictResolver;
  private operationLogs: OperationLog[] = [];
  private stashRef?: string;
  private hasChanges: boolean = false;

  constructor(config: AgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    // Initialize services
    this.gitService = new GitService(config.repoPath, logger);
    this.aiService = new AIService(config.openaiApiKey, logger);
    this.conflictResolver = new ConflictResolver(config.repoPath, logger);
  }

  /**
   * Execute full workflow: stage → pull → resolve conflicts → commit → push
   */
  async executeFullWorkflow(): Promise<AgentResult> {
    this.logger.section('🚀 Starting Git Agent Workflow');

    try {
      // Step 1: Check status and stage changes
      await this.stageChanges();

      // Step 2: Pull latest from parent branch
      await this.pullChanges();

      // Step 3: Check for conflicts
      const hasConflicts = await this.gitService.hasConflicts();

      if (hasConflicts) {
        // Step 4: Resolve conflicts
        await this.resolveConflicts();
      }

      // Step 5: Commit changes
      const commitHash = await this.commitChanges();

      // Step 6: Push changes
      await this.pushChanges();

      this.logger.section('✅ Workflow completed successfully');

      return {
        success: true,
        message: 'Git workflow completed successfully',
        data: {
          commitHash,
          conflictsResolved: hasConflicts,
        },
      };
    } catch (error) {
      this.logger.error(`Workflow failed: ${error}`);

      // Attempt rollback
      const rollbackResult = await this.rollback();

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          rollback: rollbackResult,
        },
        rollbackAvailable: !rollbackResult.success,
      };
    }
  }

  /**
   * Stage changes
   */
  private async stageChanges(): Promise<void> {
    this.logOperation('stage', 'started');

    try {
      const status = await this.gitService.getStatus();

      this.logger.info(`📊 Repository Status:`);
      this.logger.info(`  Branch: ${status.branch}`);
      this.logger.info(`  Staged: ${status.staged.length}`);
      this.logger.info(`  Unstaged: ${status.unstaged.length}`);
      this.logger.info(`  Untracked: ${status.untracked.length}`);

      if (!status.isDirty && status.staged.length === 0) {
        this.logger.warn('No changes to commit');
        this.hasChanges = false;
        return;
      }

      if (this.config.dryRun) {
        this.logger.info('[DRY-RUN] Would stage changes');
      } else {
        await this.gitService.stage();
        this.hasChanges = true;
      }

      this.logOperation('stage', 'completed');
    } catch (error) {
      this.logOperation('stage', 'failed', `${error}`);
      throw error;
    }
  }

  /**
   * Pull changes from parent branch
   */
  private async pullChanges(): Promise<void> {
    this.logOperation('pull', 'started');

    try {
      this.logger.info(`Pulling from ${this.config.baseBranch}...`);

      // Create stash before pull for safety
      if (!this.config.dryRun && !this.hasChanges) {
        try {
          this.stashRef = await this.gitService.stash('git-agent-pre-pull-backup');
          this.logger.info(`Created backup stash: ${this.stashRef}`);
        } catch (error) {
          this.logger.debug(`Could not create stash (might be clean): ${error}`);
        }
      }

      await this.gitService.pull(this.config.baseBranch, this.config.dryRun);
      this.logOperation('pull', 'completed');
    } catch (error) {
      this.logOperation('pull', 'failed', `${error}`);
      throw error;
    }
  }

  /**
   * Resolve merge conflicts
   */
  private async resolveConflicts(): Promise<void> {
    this.logOperation('conflict-resolution', 'started');

    try {
      const conflictingFiles = await this.gitService.getConflictingFiles();

      if (conflictingFiles.length === 0) {
        this.logger.info('No conflicting files found');
        return;
      }

      this.logger.warn(`⚠️  Found ${conflictingFiles.length} conflicting file(s)`);

      // Get conflict context
      const context = await this.conflictResolver.getMergeConflictContext(
        conflictingFiles,
        this.config.baseBranch,
        await this.gitService.getCurrentBranch(),
      );

      // Display conflicts
      for (const conflict of context.conflictFiles) {
        this.conflictResolver.displayConflictContext(conflict);
      }

      // Try auto-resolve if strategy is set
      if (this.config.autoResolveStrategy) {
        this.logger.info(
          `Auto-resolving conflicts with strategy: ${this.config.autoResolveStrategy}`,
        );

        for (const file of conflictingFiles) {
          const strategy = this.config.autoResolveStrategy === 'keep-current' ? 'ours' : 'theirs';
          await this.gitService.resolveConflict(file, strategy);
        }

        this.logger.success('Auto-resolved conflicts');
      } else {
        // Manual resolution would be handled by CLI
        this.logger.warn('Manual conflict resolution required');
        throw new GitAgentError('Manual conflict resolution required - use CLI to resolve');
      }

      this.logOperation('conflict-resolution', 'completed');
    } catch (error) {
      this.logOperation('conflict-resolution', 'failed', `${error}`);
      throw error;
    }
  }

  /**
   * Commit changes with AI-generated message
   */
  private async commitChanges(): Promise<string> {
    this.logOperation('commit', 'started');

    try {
      if (!this.hasChanges) {
        this.logger.info('No changes to commit');
        return 'no-commit';
      }

      // Validate pre-commit checks
      await this.runPreCommitValidation();

      // Get diff for AI analysis
      const diff = await this.gitService.getDiff(true);

      if (diff.filesChanged === 0) {
        this.logger.info('No staged changes to commit');
        this.logOperation('commit', 'completed');
        return 'no-commit';
      }

      this.logger.info(`📝 Staged changes: ${diff.filesChanged} files, +${diff.insertions}/-${diff.deletions}`);

      // Generate commit message
      const currentBranch = await this.gitService.getCurrentBranch();
      let commitMessage = await this.aiService.generateCommitMessage(diff, currentBranch);

      // Validate message length
      if (commitMessage.length > 72) {
        commitMessage = commitMessage.substring(0, 69) + '...';
      }

      // Commit
      const commit = await this.gitService.commit(commitMessage, this.config.dryRun);

      if (commit) {
        this.logOperation('commit', 'completed', `Hash: ${commit.hash}`);
        return commit.hash;
      }

      return 'dry-run';
    } catch (error) {
      this.logOperation('commit', 'failed', `${error}`);
      throw error;
    }
  }

  /**
   * Run pre-commit validation checks
   */
  private async runPreCommitValidation(): Promise<void> {
    this.logger.section('🔍 Running Pre-Commit Validation');

    try {
      // Check for secrets in staged files
      await this.detectSecrets();

      // Run build check
      await this.validateBuild();

      this.logger.success('✅ Pre-commit validation passed');
    } catch (error) {
      throw new GitAgentError(
        `Pre-commit validation failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  /**
   * Detect common secrets in staged changes
   */
  private async detectSecrets(): Promise<void> {
    this.logger.info('Scanning for secrets...');

    try {
      const secretPatterns = {
        'API Keys': /(?:api[_-]?key|apikey|api_secret)[\s]*[:=][\s]*['\"]?([a-zA-Z0-9\-_.]{20,})['\"]?/gi,
        'AWS Keys': /(?:AKIA|aws_secret_access_key)[\s]*[:=]/gi,
        'Private Keys': /-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY/gi,
        'Tokens': /(?:token|auth|bearer)[\s]*[:=][\s]*['\"]?([a-zA-Z0-9\-_.]{30,})['\"]?/gi,
        'Passwords': /(?:password|passwd|pwd)[\s]*[:=][\s]*['\"]([^'\"]{6,})['\"]?/gi,
      };

      const diff = await this.gitService.getDiff(true);
      const lines = diff.diff.split('\n');

      let secretsFound = false;
      for (const [secretType, pattern] of Object.entries(secretPatterns)) {
        for (const line of lines) {
          if (pattern.test(line)) {
            this.logger.warn(`⚠️  Potential ${secretType} detected in diff`);
            secretsFound = true;
            break;
          }
        }
      }

      if (secretsFound) {
        throw new GitAgentError(
          'Secrets detected in staged changes. Please remove them before committing.'
        );
      }

      this.logger.success('✅ No secrets detected');
    } catch (error) {
      if (error instanceof GitAgentError) throw error;
      this.logger.debug(`Secret detection warning: ${error}`);
    }
  }

  /**
   * Validate that code builds successfully
   */
  private async validateBuild(): Promise<void> {
    this.logger.info('Validating build...');

    try {
      const packageJsonPath = `${this.config.repoPath}/package.json`;
      
      if (!fs.existsSync(packageJsonPath)) {
        this.logger.debug('No package.json found, skipping build check');
        return;
      }

      // Try to run build/check script if it exists
      try {
        this.logger.debug('Running pre-commit build check...');
        execSync('npm run check 2>&1', {
          cwd: this.config.repoPath,
          stdio: 'pipe',
          timeout: 60000, // 60 second timeout
        });
        this.logger.success('✅ Build validation passed');
      } catch (buildError: any) {
        const errorOutput = buildError.stdout?.toString() || buildError.stderr?.toString() || buildError.message;
        throw new GitAgentError(
          `Build validation failed. Please fix the following errors:\n${errorOutput}`
        );
      }
    } catch (error) {
      if (error instanceof GitAgentError) throw error;
      this.logger.warn(`Build check not available: ${error}`);
    }
  }

  /**
   * Push changes to remote
   */
  private async pushChanges(): Promise<void> {
    this.logOperation('push', 'started');

    try {
      await this.gitService.push(this.config.dryRun);
      this.logOperation('push', 'completed');
    } catch (error) {
      this.logOperation('push', 'failed', `${error}`);
      throw error;
    }
  }

  /**
   * Rollback changes
   */
  private async rollback(): Promise<AgentResult> {
    this.logger.section('⏮️  Attempting Rollback');

    try {
      // Try to abort merge if in progress
      const mergeInProgress = await this.gitService.isMergeInProgress();
      if (mergeInProgress) {
        await this.gitService.abortMerge();
        this.logger.success('Aborted merge');
      }

      // Restore stash if it exists
      if (this.stashRef) {
        await this.gitService.applyStash(this.stashRef);
        this.logger.success(`Restored stash: ${this.stashRef}`);
      }

      return {
        success: true,
        message: 'Rollback completed',
      };
    } catch (error) {
      throw new RollbackError(`Rollback failed: ${error}`);
    }
  }

  /**
   * Get operation logs
   */
  getOperationLogs(): OperationLog[] {
    return this.operationLogs;
  }

  /**
   * Log an operation
   */
  private logOperation(
    operation: string,
    status: 'started' | 'completed' | 'failed',
    details: string = '',
  ): void {
    this.operationLogs.push({
      timestamp: new Date(),
      operation,
      status,
      details,
    });
  }

  /**
   * Validate configuration
   */
  async validateConfig(): Promise<boolean> {
    this.logger.debug('Validating configuration...');

    // Validate OpenAI API
    const isValidApiKey = await this.aiService.validateApiKey();
    if (!isValidApiKey) {
      this.logger.error('Invalid OpenAI API key');
      return false;
    }

    return true;
  }

  /**
   * Get current status
   */
  async getStatus(): Promise<any> {
    const status = await this.gitService.getStatus();
    const branch = await this.gitService.getCurrentBranch();
    const logs = await this.gitService.getCommitLog(5);

    return {
      branch,
      status,
      recentCommits: logs,
      isDirty: status.isDirty,
    };
  }
}
