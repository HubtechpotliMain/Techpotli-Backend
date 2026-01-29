#!/usr/bin/env node
/**
 * Railway start script: ensures HOST=0.0.0.0 and PORT are set so the app
 * is reachable from Railway's proxy and healthcheck. Then runs medusa start.
 */
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.PORT = process.env.PORT || '9000';

const { spawn } = require('child_process');
const medusa = spawn('npx', ['medusa', 'start'], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd(),
});
medusa.on('exit', (code, signal) => {
  process.exit(code != null ? code : signal ? 1 : 0);
});
medusa.on('error', (err) => {
  console.error('Failed to start medusa:', err);
  process.exit(1);
});
