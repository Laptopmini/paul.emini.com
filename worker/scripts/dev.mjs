// Starts `wrangler dev` with only the LLM keys forwarded from the parent shell, so
// unrelated secrets in the developer's environment never reach the Worker.
// Usage: OPENROUTER_API_KEY=… pnpm worker:dev   (or `pnpm worker:mock`, no key)
import { spawn } from 'node:child_process';

const FORWARD = ['OPENROUTER_API_KEY'];
const SYSTEM = ['PATH', 'HOME', 'TMPDIR', 'TERM', 'LANG'];

const env = { CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true', WRANGLER_SEND_METRICS: 'false' };
for (const key of [...SYSTEM, ...FORWARD]) {
  if (process.env[key]) env[key] = process.env[key];
}

const child = spawn('wrangler', ['dev', '--env', 'dev', ...process.argv.slice(2)], {
  env,
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 0));
