#!/usr/bin/env node

/**
 * CLI Entry Point
 */

import { GitAgentCLI } from './index';

const cli = new GitAgentCLI();
cli.run(process.argv.slice(2)).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
