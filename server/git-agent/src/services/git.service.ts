/**
 * Git Service - Handles all Git operations
 */

import simpleGit, { SimpleGit, DefaultLogFields } from 'simple-git';
import fs from 'fs';
import path from 'path';
import Logger from '../utils/logger';
import { GitOperationError, ValidationError } from '../utils/errors';
import { GitStatus, DiffInfo, CommitInfo } from '../types';

export class GitService {
  private git: SimpleGit;
  private repoPath: string;
  private logger: Logger;

  constructor(repoPath: string, logger: Logger) {
    if (!fs.existsSync(repoPath)) {
      throw new ValidationError(`Repository path does not exist: ${repoPath}`);
    }

    this.repoPath = repoPath;
    this.logger = logger;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get current repository status
   */
  async getStatus(): Promise<GitStatus> {
    try {
      this.logger.debug('Fetching repository status...');
      const status = await this.git.status();

      return {
        branch: status.current || 'unknown',
        staged: status.staged,
        unstaged: status.not_added.concat(status.modified),
        untracked: status.untracked,
        isDirty: status.isClean() === false,
      };
    } catch (error) {
      throw new GitOperationError(`Failed to get status: ${error}`);
    }
  }

  /**
   * Stage all changes or specific files
   */
  async stage(files?: string[]): Promise<void> {
    try {
      if (files && files.length > 0) {
        this.logger.debug(`Staging ${files.length} file(s)...`);
        await this.git.add(files);
      } else {
        this.logger.debug('Staging all changes...');
        await this.git.add(['.']);
      }
      this.logger.success('Changes staged successfully');
    } catch (error) {
      throw new GitOperationError(`Failed to stage changes: ${error}`);
    }
  }

  /**
   * Commit staged changes
   */
  async commit(message: string, dryRun: boolean = false): Promise<CommitInfo | null> {
    try {
      if (dryRun) {
        this.logger.info(`[DRY-RUN] Would commit with message: ${message}`);
        return null;
      }

      this.logger.debug(`Committing with message: ${message}`);
      const result = await this.git.commit(message);

      this.logger.success(`Commit created: ${result.commit}`);
      return {
        hash: result.commit,
        author: result.author || 'unknown',
        date: new Date(),
        message,
      };
    } catch (error) {
      throw new GitOperationError(`Failed to commit: ${error}`);
    }
  }

  /**
   * Get diff of staged or unstaged changes
   */
  async getDiff(cached: boolean = true): Promise<DiffInfo> {
    try {
      this.logger.debug('Fetching diff...');

      const diffResult = await this.git.diff([cached ? '--cached' : '']);
      const statResult = await this.git.diff([
        '--stat',
        cached ? '--cached' : '',
      ]);

      const lines = statResult.split('\n');
      let filesChanged = 0;
      let insertions = 0;
      let deletions = 0;

      for (const line of lines) {
        const match = line.match(/(\d+)\s+insertion.*?(\d+)\s+deletion/);
        if (match) {
          insertions += parseInt(match[1], 10) || 0;
          deletions += parseInt(match[2], 10) || 0;
        }
      }

      filesChanged = (statResult.match(/^\s*\S+\s*\|/gm) || []).length;

      return {
        filesChanged,
        insertions,
        deletions,
        diff: diffResult,
      };
    } catch (error) {
      throw new GitOperationError(`Failed to get diff: ${error}`);
    }
  }

  /**
   * Pull changes from parent branch
   */
  async pull(parentBranch: string, dryRun: boolean = false): Promise<void> {
    try {
      const currentBranch = (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
      this.logger.info(`Current branch: ${currentBranch}, pulling from: ${parentBranch}`);

      if (dryRun) {
        this.logger.info(`[DRY-RUN] Would pull from ${parentBranch}`);
        return;
      }

      await this.git.pull('origin', parentBranch);
      this.logger.success(`Successfully pulled from ${parentBranch}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('CONFLICT')) {
        throw new GitOperationError(`Merge conflicts detected during pull from ${parentBranch}`, 'git pull');
      }
      throw new GitOperationError(`Failed to pull from ${parentBranch}: ${error}`);
    }
  }

  /**
   * Push changes to remote
   */
  async push(dryRun: boolean = false): Promise<void> {
    try {
      const currentBranch = (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
      this.logger.info(`Pushing branch: ${currentBranch}`);

      if (dryRun) {
        this.logger.info(`[DRY-RUN] Would push to origin ${currentBranch}`);
        return;
      }

      await this.git.push('origin', currentBranch);
      this.logger.success(`Successfully pushed to origin/${currentBranch}`);
    } catch (error) {
      throw new GitOperationError(`Failed to push: ${error}`);
    }
  }

  /**
   * Check if there are merge conflicts
   */
  async hasConflicts(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.unstaged.some((file) =>
        file.includes('both') || file.includes('conflict')
      );
    } catch (error) {
      throw new GitOperationError(`Failed to check for conflicts: ${error}`);
    }
  }

  /**
   * Get conflicting files
   */
  async getConflictingFiles(): Promise<string[]> {
    try {
      this.logger.debug('Fetching conflicting files...');
      const result = await this.git.raw(['diff', '--name-only', '--diff-filter=U']);
      return result
        .split('\n')
        .filter((file) => file.trim().length > 0);
    } catch (error) {
      throw new GitOperationError(`Failed to get conflicting files: ${error}`);
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = path.join(this.repoPath, filePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      throw new GitOperationError(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * Write file content
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.join(this.repoPath, filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf-8');
    } catch (error) {
      throw new GitOperationError(`Failed to write file ${filePath}: ${error}`);
    }
  }

  /**
   * Get commit log
   */
  async getCommitLog(limit: number = 10): Promise<CommitInfo[]> {
    try {
      const log = await this.git.log({ maxCount: limit });
      return log.all.map((commit: DefaultLogFields) => ({
        hash: commit.hash,
        author: commit.author_name,
        date: new Date(commit.date),
        message: commit.message,
      }));
    } catch (error) {
      throw new GitOperationError(`Failed to get commit log: ${error}`);
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    try {
      return (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
    } catch (error) {
      throw new GitOperationError(`Failed to get current branch: ${error}`);
    }
  }

  /**
   * Create a stash (for rollback)
   */
  async stash(message: string = 'git-agent-backup'): Promise<string> {
    try {
      this.logger.debug(`Creating stash: ${message}`);
      const stashList = await this.git.stashList();
      const stashCount = Object.keys(stashList.all).length;
      await this.git.stash(['push', '-m', message]);
      this.logger.success(`Stash created at index 0`);
      return `stash@{0}`;
    } catch (error) {
      throw new GitOperationError(`Failed to create stash: ${error}`);
    }
  }

  /**
   * Apply a stash
   */
  async applyStash(stashRef: string): Promise<void> {
    try {
      this.logger.debug(`Applying stash: ${stashRef}`);
      await this.git.stash(['apply', stashRef]);
      this.logger.success(`Stash applied: ${stashRef}`);
    } catch (error) {
      throw new GitOperationError(`Failed to apply stash: ${error}`);
    }
  }

  /**
   * Abort merge or rebase
   */
  async abortMerge(): Promise<void> {
    try {
      this.logger.debug('Aborting merge...');
      await this.git.merge(['--abort']);
      this.logger.success('Merge aborted');
    } catch (error) {
      throw new GitOperationError(`Failed to abort merge: ${error}`);
    }
  }

  /**
   * Check if merge is in progress
   */
  async isMergeInProgress(): Promise<boolean> {
    try {
      const gitDir = path.join(this.repoPath, '.git');
      return fs.existsSync(path.join(gitDir, 'MERGE_HEAD'));
    } catch (error) {
      throw new GitOperationError(`Failed to check merge status: ${error}`);
    }
  }

  /**
   * Resolve conflict with strategy
   */
  async resolveConflict(
    filePath: string,
    strategy: 'ours' | 'theirs',
  ): Promise<void> {
    try {
      this.logger.debug(`Resolving ${filePath} with strategy: ${strategy}`);
      await this.git.raw([
        'checkout',
        strategy === 'ours' ? '--ours' : '--theirs',
        filePath,
      ]);
      await this.git.add([filePath]);
      this.logger.success(`Resolved ${filePath} with ${strategy} strategy`);
    } catch (error) {
      throw new GitOperationError(`Failed to resolve conflict in ${filePath}: ${error}`);
    }
  }
}
