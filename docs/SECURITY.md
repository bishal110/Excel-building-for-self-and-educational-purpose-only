# 🔐 Security

AI_Office is a fully client-side app — there is no server, no account, and no
data leaves the machine. That removes whole classes of risk (no server breach,
no credential theft) but the remaining surface still deserves engineering.
This page is the honest threat model: what's protected, how, and what's still
on the roadmap.

## Threat model

| # | Threat | Vector | Status |
|---|---|---|---|
| 1 | Script injection via URLs | A shared `.aioffice` file or pasted URL uses `javascript:` / `data:text/html` in a slide image or document link | ✅ **Mitigated** — all user URLs pass `sanitizeImageUrl` / `sanitizeLinkUrl` (`src/ui/security.ts`, unit-tested); only `http(s)`, `mailto`, and `data:image/*` survive |
| 2 | HTML injection via cell/slide text | Malicious text in cells, titles, notes | ✅ **Mitigated by construction** — all text renders through React text nodes (auto-escaped); the app never uses `dangerouslySetInnerHTML` |
| 3 | Malicious macros | A shared file's macro reads/exfiltrates data or hijacks the page | ⚠️ **Partially mitigated** — macros run only when *you* click Run (never on file open, unlike classic Office macro viruses), and common globals (`window`, `document`, `fetch`, `process`) are shadowed. But in-process JS cannot be fully sandboxed. **Roadmap:** move execution into a Web Worker with no DOM handle. Until then: don't run macros from files you don't trust |
| 4 | CSV formula injection | Our CSV export opened in *Excel* could auto-execute `=cmd\|...`-style payloads planted in cell text | ⚠️ **Documented** — a known cross-app issue with every CSV producer; mitigation (prefixing `'` on `= + - @` cells at export) is on the roadmap as an opt-in, since it alters data |
| 5 | Supply-chain risk | A compromised npm dependency ships code into the bundle | ⚠️ **Reduced surface** — few runtime deps (React, TipTap, SheetJS, docx), lockfile pinned; no post-install scripts of our own. `npm audit` is clean (0 findings) as of 2026-07. Roadmap: CI `npm audit` gate |
| 5b | Malicious workbook file | A booby-trapped `.xlsx` exploits the parser when you open it (prototype pollution / regex-DoS) | ✅ **Mitigated** — SheetJS upgraded 0.18.5 → **0.20.3**, which fixes GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9. Note: SheetJS stopped publishing to npm at 0.18.5; 0.20.3 installs via the npm alias `xlsx → @e965/xlsx`, a mirror of the official `cdn.sheetjs.com` builds. To verify it yourself, diff the installed package against the official tarball: `npm pack @e965/xlsx@0.20.3` vs `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| 6 | Data-at-rest exposure | Autosave lives in plaintext `localStorage`; anyone with the browser profile can read it | ℹ️ **Inherent to local-first** — same trust level as any file on your disk. Roadmap idea: optional passphrase-encrypted `.aioffice` (WebCrypto AES-GCM) |
| 7 | Stale cached app | The PWA service worker serves an old, potentially vulnerable version | ✅ **Mitigated** — network-first navigation strategy updates the app whenever online |

## Design choices that quietly matter

- **No `eval` on formulas.** The formula engine is a real parser/evaluator, not
  `eval()` — formula text can never execute as JavaScript.
- **Popup/window hygiene.** External links in the Electron shell open in the
  system browser (`setWindowOpenHandler` → deny); the renderer runs with
  `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- **Macros are opt-in per click, never on open.** The single biggest lesson
  from Office's macro-virus era, applied from day one.

## Why the scariest attacks don't apply here (yet)

The most common real-world app failures — a user editing a URL/parameter to
touch *someone else's* data (IDOR), bots brute-forcing logins, scraped or
leaked databases — all require a **server that trusts clients**. AI_Office has
**no server, no accounts, no shared database, and no network endpoints**. Your
data exists only on your device. A bot cannot bypass a security layer that has
no door on the internet. This is not luck; it is the deliberate local-first
architecture.

## ⚠️ The Online Rules — binding for any future networked floor

The moment anyone adds an online feature to this project (cloud save, sharing,
collaboration, an AI proxy), the rules below are **non-negotiable**. They exist
so this app never repeats the classic mistakes (e.g. the restaurant app whose
table number could be changed from the browser):

1. **Never trust the client.** Anything arriving from a browser — IDs, prices,
   table numbers, role flags, hidden fields, headers — is attacker-controlled
   input. The server re-checks *everything*.
2. **Authorize every request, not just login.** Authentication says who you
   are; authorization says what you may touch. Every read/write must verify
   "does *this* user own *this* resource?" server-side. Sequential or guessable
   IDs must never be the only protection — use random IDs *and* ownership checks.
3. **Validate server-side, always.** Client-side validation is UX, not
   security — bots skip the UI entirely and talk straight to the API.
4. **Rate-limit and bot-proof by default.** Per-IP and per-account limits on
   every endpoint, exponential backoff on auth, CAPTCHA/proof-of-work on
   abuse-prone flows, and monitoring that alerts on anomalies.
5. **Secrets never ship to the client.** API keys, tokens, and credentials
   live server-side only. Anything in a JS bundle is public — assume it is
   read the day it ships.
6. **Least privilege everywhere.** The database user, the API token, the
   service account — each gets the minimum rights it needs, so one breach
   doesn't become a full breach.
7. **HTTPS only, secure cookies, CSRF protection, security headers** (CSP,
   `frame-ancestors`, HSTS) — the boring baseline, applied without exceptions.
8. **Log security events and test like an attacker.** Every new endpoint gets
   an adversarial test that *tries* to access another user's data — the same
   philosophy as our Phase-7 audit, pointed at authorization.

Rule of thumb inherited from this project's method: **a feature is not done
when it works — it is done when its abuse cases have failing-then-passing
tests.**

## Reporting

This is an educational project — if you find an issue, please open a GitHub
issue with reproduction steps. There is no bounty, but there is gratitude and
a `BUGLOG.md` entry with your finding credited.
