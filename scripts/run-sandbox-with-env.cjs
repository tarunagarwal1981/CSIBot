/**
 * Runs Amplify sandbox with environment variables loaded from .env
 * Usage: node scripts/run-sandbox-with-env.cjs
 * Or: npm run sandbox:local
 */

const { spawn } = require('child_process');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const child = spawn('npx', ['ampx', 'sandbox'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
