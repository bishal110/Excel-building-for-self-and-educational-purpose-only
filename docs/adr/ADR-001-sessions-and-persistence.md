# ADR-001 — Document sessions and a shared persistence layer

Status: **Proposed** (accepted direction; implementation is the next major
pass — nothing in this ADR is shipped yet, and nothing existing breaks
until it is).

## Current problem

Each module persists itself through a **singleton**:

| Module | State owner | Persistence today |
|---|---|---|
| Sheets | `store.ts` (`Store` singleton) | debounced (400 ms) `JSON.stringify` of the whole project → `localStorage` |
| Docs | TipTap editor + `DocsView` | HTML string → `localStorage` |
| Slides | `slidesStore.ts` singleton | deck JSON → `localStorage` |

Consequences:

1. **One document per module, forever.** A second workbook or deck requires
   architectural surgery because module UIs import their singleton directly.
2. **No shared save state.** Each module invents its own autosave; the shell
   cannot show a truthful saved/saving/unsaved indicator.
3. **`localStorage` ceilings.** Whole-project JSON on every change caps
   document size (~5 MB), makes large base64 images dangerous, and is
   synchronous at write time (the debounce only hides frequency, not cost).
4. **No schema versioning.** `.aioffice` and autosave have an `app` marker but
   no migration path when shapes change.

## Options considered

- **A. Keep singletons, add features around them.** Cheapest now; every new
  capability (recent files, multiple docs, cloud sync) gets harder. Rejected
  as the long-term plan; acceptable as the short-term state.
- **B. Full multi-document workspace now.** Correct end-state; but it touches
  every module UI at once — too much risk in one change (violates our own
  no-giant-rewrite rule).
- **C. Incremental: introduce a `DocumentSession` model + `PersistenceDriver`
  abstraction first, migrate modules one at a time.** Chosen.

## Chosen approach (C), in stages

```ts
interface DocumentSession {
  id: string;
  module: 'spreadsheet' | 'document' | 'presentation';
  title: string;
  dirty: boolean;
  saveState: 'saved' | 'saving' | 'error';
  modifiedAt: number;
  schemaVersion: number;
}

interface PersistenceDriver {
  load(id: string): Promise<Envelope | null>;
  save(id: string, data: Envelope): Promise<void>; // debounced by caller
  list(): Promise<SessionMeta[]>;
  remove(id: string): Promise<void>;
}
```

- **Stage 1 — envelope + versioning (no behavior change).** Wrap today's three
  autosave payloads in `{ app: 'AI_Office', schemaVersion: 1, module, data }`.
  A `migrate(envelope)` pipeline runs on load; version-1 migration is the
  identity. Old un-enveloped payloads are detected and lifted to v1 (test:
  legacy autosave still loads).
- **Stage 2 — IndexedDB driver.** Same envelope, stored via IndexedDB
  (`idb`-style thin wrapper, no new dependency if feasible). `localStorage`
  remains as fallback + migration source. Large binary assets (images) become
  separate records, referenced by id — never base64 inside the document JSON.
- **Stage 3 — session registry.** The shell owns a `sessions` list (metadata
  in one small record). Modules receive their session id instead of importing
  a singleton. Singletons become per-session instances behind a
  `getStore(sessionId)` factory; the current UIs keep working with the
  default session.
- **Stage 4 — UI.** Recent-projects list, per-session titles, and a truthful
  saved/saving indicator driven by `PersistenceDriver` promise state.

## Migration risk & rollback

- Every stage keeps reading the previous format (v0 = today's bare payloads).
- Autosave writes go to the NEW location only after a successful read+migrate
  round-trip test passes in CI (`migration.test.ts`).
- Rollback per stage = revert the commit; old data is never deleted, only
  superseded (the v0 keys are left in place for one release).

## Tests required per stage

1. Envelope: v0→v1 lift, corrupt envelope → clean error, round-trip.
2. IndexedDB: save/load/list/remove, quota-exceeded surfaces a visible error
   (no silent catch), fallback to localStorage when IndexedDB is unavailable.
3. Sessions: two spreadsheet sessions don't bleed state; deleting a session
   doesn't touch others.
4. Perf budget: autosave of a 10,000-cell workbook must not block the main
   thread longer than one frame (measured, not assumed).
