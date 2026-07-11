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
| 5 | Supply-chain risk | A compromised npm dependency ships code into the bundle | ⚠️ **Reduced surface** — few runtime deps (React, TipTap, SheetJS, docx), lockfile pinned; no post-install scripts of our own. Roadmap: CI `npm audit` gate |
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

## Reporting

This is an educational project — if you find an issue, please open a GitHub
issue with reproduction steps. There is no bounty, but there is gratitude and
a `BUGLOG.md` entry with your finding credited.
