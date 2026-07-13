import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { functionCount } from '../engine/formula/functions';

/**
 * Facts audit — the single-source-of-truth policy for documentation numbers,
 * wired into `npm run build` so drift FAILS THE BUILD (same pattern as the
 * Help↔keybinding audit).
 *
 * Policy:
 *  - Exact counts (e.g. "144 functions") may appear ONLY in README.md, and
 *    must equal the value computed from the code.
 *  - Every other document uses lower bounds ("140+ functions") or qualitative
 *    wording; lower bounds must actually hold.
 *  - Historical documents (BUGLOG.md, docs/PHASE7_REPORT.md) are exempt: they
 *    are dated records, not current claims, and each carries a preface saying
 *    so (this test asserts the preface exists).
 */

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

const HISTORICAL = new Set(['BUGLOG.md', 'docs/PHASE7_REPORT.md']);

function currentDocs(): string[] {
  const docs = readdirSync(join(ROOT, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => `docs/${f}`);
  return ['README.md', 'KNOWN_LIMITS.md', 'BUILD_ON_WINDOWS.md', 'CONTRIBUTING.md', ...docs].filter(
    (p) => !HISTORICAL.has(p),
  );
}

describe('facts audit (single source of truth)', () => {
  it('README function counts exactly match the engine registry', () => {
    const readme = read('README.md');
    const matches = [...readme.matchAll(/(~?)(\d+)(\+?) functions/g)];
    expect(matches.length, 'README should state the function count at least once').toBeGreaterThan(0);
    for (const m of matches) {
      if (m[1] === '~') continue; // approximations about OTHER products
      const n = Number(m[2]);
      if (m[3] === '+') {
        expect(functionCount(), `README lower bound "${m[0]}"`).toBeGreaterThanOrEqual(n);
      } else {
        expect(n, `README exact claim "${m[0]}" vs engine registry`).toBe(functionCount());
      }
    }
  });

  it('non-README documents never state exact function counts (lower bounds only)', () => {
    for (const p of currentDocs()) {
      if (p === 'README.md') continue;
      const text = read(p);
      for (const m of text.matchAll(/(~?)(\d+)(\+?) functions/g)) {
        if (m[1] === '~') continue; // "~500 functions" describing Excel is fine
        expect(m[3], `${p}: "${m[0]}" — exact counts belong in README only; use "N+"`).toBe('+');
        expect(functionCount(), `${p}: stale lower bound "${m[0]}"`).toBeGreaterThanOrEqual(Number(m[2]));
      }
    }
  });

  it('README badges carry no exact test counts (they drift)', () => {
    const readme = read('README.md');
    const badges = readme.match(/img\.shields\.io[^)"\s]*/g) ?? [];
    for (const b of badges) {
      expect(b, `badge "${b}" hard-codes a count — use plain "passing"`).not.toMatch(/\d+_passing/);
    }
  });

  it('historical documents carry their point-in-time preface', () => {
    expect(read('BUGLOG.md')).toContain('reflect the repo *at that time*');
    expect(read('docs/PHASE7_REPORT.md')).toContain('Historical snapshot');
  });

  it('KNOWN_LIMITS no longer claims unfinished phases or single-sheet export', () => {
    const kl = read('KNOWN_LIMITS.md');
    expect(kl).not.toMatch(/not started/i);
    expect(kl).not.toMatch(/only the\s+active sheet/i);
  });
});
