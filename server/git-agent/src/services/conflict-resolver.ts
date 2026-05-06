/**
 * Conflict Resolver - Handles merge conflicts
 */

import fs from 'fs';
import path from 'path';
import Logger from '../utils/logger';
import { ConflictResolutionError, GitOperationError } from '../utils/errors';
import { ConflictFile, ConflictMarker, MergeConflictContext } from '../types';

export class ConflictResolver {
  private repoPath: string;
  private logger: Logger;
  private conflictMarkerStart = '<<<<<<<';
  private conflictMarkerMiddle = '=======';
  private conflictMarkerEnd = '>>>>>>>';

  constructor(repoPath: string, logger: Logger) {
    this.repoPath = repoPath;
    this.logger = logger;
  }

  /**
   * Parse conflict markers in a file
   */
  parseConflictMarkers(content: string): ConflictMarker[] {
    const markers: ConflictMarker[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      if (lines[i].startsWith(this.conflictMarkerStart)) {
        const startLine = i;
        const currentContent: string[] = [];

        i++;
        while (i < lines.length && !lines[i].startsWith(this.conflictMarkerMiddle)) {
          currentContent.push(lines[i]);
          i++;
        }

        if (i < lines.length && lines[i].startsWith(this.conflictMarkerMiddle)) {
          const incomingContent: string[] = [];
          i++;

          while (i < lines.length && !lines[i].startsWith(this.conflictMarkerEnd)) {
            incomingContent.push(lines[i]);
            i++;
          }

          if (i < lines.length && lines[i].startsWith(this.conflictMarkerEnd)) {
            markers.push({
              startLine,
              endLine: i,
              currentContent: currentContent.join('\n'),
              incomingContent: incomingContent.join('\n'),
            });
            i++;
          }
        }
      } else {
        i++;
      }
    }

    return markers;
  }

  /**
   * Parse conflicting file
   */
  async parseConflictingFile(filePath: string): Promise<ConflictFile> {
    try {
      const fullPath = path.join(this.repoPath, filePath);

      if (!fs.existsSync(fullPath)) {
        throw new ConflictResolutionError(`File not found: ${filePath}`);
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const markers = this.parseConflictMarkers(content);

      if (markers.length === 0) {
        throw new ConflictResolutionError(`No conflict markers found in ${filePath}`);
      }

      return {
        path: filePath,
        currentBranchContent: markers[0]?.currentContent || '',
        parentBranchContent: markers[0]?.incomingContent || '',
        conflictMarkers: markers,
      };
    } catch (error) {
      if (error instanceof ConflictResolutionError) {
        throw error;
      }
      throw new ConflictResolutionError(
        `Failed to parse conflicting file ${filePath}: ${error}`,
      );
    }
  }

  /**
   * Resolve conflict by keeping current branch content
   */
  async resolveKeepCurrent(filePath: string): Promise<void> {
    try {
      this.logger.info(`Resolving ${filePath} - keeping current branch changes`);
      const fullPath = path.join(this.repoPath, filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      const resolved = this.removeConflictMarkers(content, 'current');
      fs.writeFileSync(fullPath, resolved, 'utf-8');

      this.logger.success(`Resolved ${filePath}`);
    } catch (error) {
      throw new ConflictResolutionError(`Failed to resolve ${filePath}: ${error}`);
    }
  }

  /**
   * Resolve conflict by accepting incoming branch content
   */
  async resolveAcceptIncoming(filePath: string): Promise<void> {
    try {
      this.logger.info(`Resolving ${filePath} - accepting incoming changes`);
      const fullPath = path.join(this.repoPath, filePath);
      const content = fs.readFileSync(fullPath, 'utf-8');

      const resolved = this.removeConflictMarkers(content, 'incoming');
      fs.writeFileSync(fullPath, resolved, 'utf-8');

      this.logger.success(`Resolved ${filePath}`);
    } catch (error) {
      throw new ConflictResolutionError(`Failed to resolve ${filePath}: ${error}`);
    }
  }

  /**
   * Resolve conflict with manual content
   */
  async resolveManual(filePath: string, resolvedContent: string): Promise<void> {
    try {
      this.logger.info(`Resolving ${filePath} - manual merge`);
      const fullPath = path.join(this.repoPath, filePath);
      fs.writeFileSync(fullPath, resolvedContent, 'utf-8');
      this.logger.success(`Resolved ${filePath}`);
    } catch (error) {
      throw new ConflictResolutionError(`Failed to resolve ${filePath}: ${error}`);
    }
  }

  /**
   * Remove conflict markers from content
   */
  private removeConflictMarkers(
    content: string,
    strategy: 'current' | 'incoming',
  ): string {
    const lines = content.split('\n');
    const resolved: string[] = [];
    let i = 0;
    let inConflict = false;
    let useCurrentBranch = true;

    while (i < lines.length) {
      if (lines[i].startsWith(this.conflictMarkerStart)) {
        inConflict = true;
        useCurrentBranch = strategy === 'current';
        i++;
      } else if (lines[i].startsWith(this.conflictMarkerMiddle)) {
        useCurrentBranch = strategy === 'incoming';
        i++;
      } else if (lines[i].startsWith(this.conflictMarkerEnd)) {
        inConflict = false;
        i++;
      } else if (!inConflict) {
        resolved.push(lines[i]);
        i++;
      } else if (useCurrentBranch && strategy === 'current') {
        resolved.push(lines[i]);
        i++;
      } else if (!useCurrentBranch && strategy === 'incoming') {
        resolved.push(lines[i]);
        i++;
      } else {
        i++;
      }
    }

    return resolved.join('\n');
  }

  /**
   * Display conflict context
   */
  displayConflictContext(conflict: ConflictFile): void {
    this.logger.section(`Conflict in: ${conflict.path}`);

    console.log('\n📝 CURRENT BRANCH CHANGES:');
    console.log('━'.repeat(60));
    console.log(conflict.currentBranchContent);

    console.log('\n📥 INCOMING CHANGES:');
    console.log('━'.repeat(60));
    console.log(conflict.parentBranchContent);

    console.log('\n' + '━'.repeat(60) + '\n');
  }

  /**
   * Get merge conflict context
   */
  async getMergeConflictContext(
    conflictingFiles: string[],
    baseBranch: string,
    currentBranch: string,
  ): Promise<MergeConflictContext> {
    try {
      const conflicts: ConflictFile[] = [];

      for (const file of conflictingFiles) {
        try {
          const conflict = await this.parseConflictingFile(file);
          conflicts.push(conflict);
        } catch (error) {
          this.logger.warn(`Could not parse conflict in ${file}`);
        }
      }

      return {
        totalConflicts: conflictingFiles.length,
        conflictFiles: conflicts,
        baseBranch,
        currentBranch,
      };
    } catch (error) {
      throw new ConflictResolutionError(
        `Failed to get merge conflict context: ${error}`,
        conflictingFiles,
      );
    }
  }

  /**
   * Auto-merge files with simple strategies
   */
  async autoMergeConflicts(conflicts: ConflictFile[]): Promise<string[]> {
    const resolved: string[] = [];

    for (const conflict of conflicts) {
      try {
        // Simple heuristic: if incoming is empty and current has content, keep current
        const incomingIsEmpty = !conflict.parentBranchContent.trim();
        const currentIsEmpty = !conflict.currentBranchContent.trim();

        if (incomingIsEmpty && !currentIsEmpty) {
          await this.resolveKeepCurrent(conflict.path);
          resolved.push(conflict.path);
          this.logger.success(`Auto-resolved ${conflict.path} (kept current)`);
        } else if (currentIsEmpty && !incomingIsEmpty) {
          await this.resolveAcceptIncoming(conflict.path);
          resolved.push(conflict.path);
          this.logger.success(`Auto-resolved ${conflict.path} (accepted incoming)`);
        }
      } catch (error) {
        this.logger.warn(`Could not auto-resolve ${conflict.path}: ${error}`);
      }
    }

    return resolved;
  }
}
