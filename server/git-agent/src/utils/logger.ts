/**
 * Logger utility with colored output and file logging
 */

import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

interface LogOptions {
  color?: boolean;
  toFile?: boolean;
  filePath?: string;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

class Logger {
  private logFile: string;
  private enableColor: boolean;

  constructor(options: LogOptions = {}) {
    this.enableColor = options.color ?? true;
    this.logFile = options.filePath ?? path.join(process.cwd(), 'git-agent.log');

    // Create log file if it doesn't exist
    if (options.toFile !== false) {
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] ${message}`;
  }

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return colors.red;
      case LogLevel.WARN:
        return colors.yellow;
      case LogLevel.SUCCESS:
        return colors.green;
      case LogLevel.INFO:
        return colors.cyan;
      case LogLevel.DEBUG:
        return colors.dim;
      default:
        return colors.white;
    }
  }

  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    const formatted = this.formatMessage(level, message);
    const colorCode = this.getColorCode(level);

    // Console output
    const consoleMessage = this.enableColor
      ? `${colorCode}${formatted}${colors.reset}`
      : formatted;

    if (level === LogLevel.ERROR) {
      console.error(consoleMessage);
    } else if (level === LogLevel.WARN) {
      console.warn(consoleMessage);
    } else {
      console.log(consoleMessage);
    }

    // File output
    this.writeToFile(formatted);

    // Additional data
    if (data) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      if (this.enableColor) {
        console.log(`${colors.dim}${dataStr}${colors.reset}`);
      } else {
        console.log(dataStr);
      }
      this.writeToFile(dataStr);
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  success(message: string, data?: any): void {
    this.log(LogLevel.SUCCESS, message, data);
  }

  section(title: string): void {
    const line = '='.repeat(60);
    console.log(`\n${colors.bright}${line}\n${title}\n${line}${colors.reset}\n`);
    this.writeToFile(`\n${'='.repeat(60)}\n${title}\n${'='.repeat(60)}\n`);
  }
}

export default Logger;
