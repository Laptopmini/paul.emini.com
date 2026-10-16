import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const SKIP = new Set(['node_modules', '.next', 'out', '.git', 'docs', '.wrangler', 'test-results']);
const TEXT = /\.(tsx?|css|json|md|ya?ml|html)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return TEXT.test(name) ? [path] : [];
  });
}

const files = walk(ROOT).map((path) => ({
  path: relative(ROOT, path),
  text: readFileSync(path, 'utf8'),
}));

describe('repo guards', () => {
  it('raw hex colors live only in app/tokens.css', () => {
    const offenders = files
      .filter((f) => /\.(tsx?|css)$/.test(f.path) && !f.path.startsWith('tests/'))
      .filter((f) => f.path !== 'app/tokens.css')
      // themeColor in the root layout mirrors --ground for the browser chrome.
      .filter((f) => /#[0-9a-f]{6}\b/i.test(f.text.replaceAll("themeColor: '#edefea'", '')))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('the accent hex is declared exactly once', () => {
    const tokens = files.find((f) => f.path === 'app/tokens.css')?.text ?? '';
    expect(tokens.match(/--accent:\s*#[0-9a-f]{6}/gi)).toHaveLength(1);
  });

  it('no phone number appears anywhere in the repo', () => {
    const phone = /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/;
    const offenders = files
      .filter((f) => f.path !== 'tests/unit/guards.test.ts' && f.path !== 'pnpm-lock.yaml')
      .filter((f) => phone.test(f.text))
      .map((f) => f.path);
    expect(offenders).toEqual([]);
  });

  it('no raw resume.md is committed', () => {
    expect(files.some((f) => /(^|\/)resume\.md$/i.test(f.path))).toBe(false);
  });
});
