# CMS Redesign, Import Safety, and Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin CMS into a Solid Cobalt sidebar command center with inline package/subtest editing, close duplicate/overwrite/explanation-mismatch import gaps with server-enforced force confirmation, and persist an audit log of CMS imports and mutations.

**Architecture:** Extend the existing PostgreSQL schema with a single idempotent `import_audit_logs` table while leaving all existing tables untouched. Extract pure canonical-hashing, live-DB comparison, and edit-validation helpers into `src/lib/import-analysis.ts`, enforce `?force=1` (`409 Conflict`) inside `importPack` and `importExplanations`, record audit entries in `/api/admin/*` routes, and upgrade `AdminShell`, `AdminDashboardClient`, `PackImporter`, and a new `/admin/audit` page to match the Solid Cobalt design tokens.

**Tech Stack:** Next.js 16.4.6 App Router, React 19.3, TypeScript, Tailwind CSS v4, PostgreSQL (`pg`), Node built-in `node:crypto` & `node:test` (`npx tsx --test`).

**Spec:** `docs/superpowers/specs/2026-11-23-cms-redesign-import-safety-design.md`

## Global Constraints

- Zero new npm dependencies; use `node:crypto` for SHA-256 hashing.
- Do not modify existing table columns in `db/schema.sql` (`companies`, `test_packages`, `subtests`, `questions`, `attempts`, `answers`); all new DDL must be idempotent (`IF NOT EXISTS`).
- Preserve 100% backward compatibility with existing JSON formats (`db/packs/*.json`, `db/Pembahasan/*.json`) and CLI `scripts/import-packs.ts`.
- Every `/api/admin/**` route handler must invoke `rejectIfNotAdmin()` first; every `/admin/**` page must use `export const dynamic = "force-dynamic"` and check admin authentication.
- Support all 4 `SubtestKind` types (`QUIZ`, `PERSONALITY`, `PAULI`, `DRAWING`); detailed-explanation completeness applies only to `QUIZ`, and `PAULI`/`DRAWING` inline edits are restricted to `name` only.
- Maintain Light & Dark mode WCAG AA contrast (&ge; 4.5:1) using CSS tokens in `src/app/globals.css`, plus keyboard focus management on mobile drawers and confirmation controls.
- Verification commands: `npx tsx --test src/lib/*.test.ts`, `npx tsc --noEmit`, `npx eslint src/`, and `npm run build` must all pass cleanly.

## Review Focus

1. **Re-uploaded JSON with different formatting or key order** — `computeCanonicalHash` and subtest content comparison must treat semantically identical payloads as identical regardless of whitespace or object key order (pinned in Task 1).
2. **Subtest-addition pack omitting `description` or differing in metadata over inline-edited package** — `description: undefined` must preserve the existing DB description instead of setting `NULL`, while differing `name`/`description` must flag `metadataChanged` and require confirmation (pinned in Task 1 & Task 3).
3. **Old `pembahasanSaja` file uploaded onto updated questions** — partial question coverage (`coverageMismatch`), overwriting existing detailed explanations, or mismatched optional `prompt` (ignoring extra whitespace) must be caught cleanly without breaking legacy files without `prompt` (pinned in Task 1 & Task 3).
4. **Inline subtest edit attempting to change duration on `PAULI` or `DRAWING`** — `validateSubtestUpdateInput` must allow `name`-only updates on `PAULI`/`DRAWING` and reject a changed `durationSeconds`, while enforcing integer `10..10800` for `QUIZ`/`PERSONALITY` (pinned in Task 1).
5. **Missing `import_audit_logs` table before `npm run db:migrate` is executed (`42P01`)** — `recordAuditLog`, `findPreviousSuccessfulUpload`, and `listAuditLogs` must fail safely and surface `migrationRequired: true` instead of crashing with HTTP 500 (pinned in Task 2).

---

### Task 1: Pure Import Analysis, Diff, and Edit Validation Helpers

**Files:**
- Create: `src/lib/import-analysis.ts`
- Test: `src/lib/import-analysis.test.ts`

**Interfaces:**
- Consumes: `PackQuestion`, `PackSubtest` from `./pack-schema`; `ExplanationEntry` from `./explanation-pack` (or structural interfaces to avoid circular imports); `SubtestKind`, `QuestionType` from `./types`.
- Produces (exported from `src/lib/import-analysis.ts`):
  - `computeCanonicalHash(payload: unknown): string`
  - `normalizePromptText(text: string): string`
  - `sanitizeImportFileName(raw: string | null | undefined): string | null`
  - `hasDetailedExplanation(entry: { steps?: string[] | null; wrongNotes?: string[] | null; quickTip?: string | null }): boolean`
  - `export type SubtestChangeType = "baru" | "identik" | "berubah"`
  - `export interface ExistingQuestionSnapshot { orderIndex: number; type: QuestionType; prompt: string; imageSvg: string | null; options: string[]; correctIndex: number; explanation: string; steps: string[] | null; wrongNotes: string[] | null; quickTip: string | null }`
  - `export interface ExistingSubtestSnapshot { name: string; description: string | null; durationSeconds: number; kind: SubtestKind; config: unknown | null; questions: ExistingQuestionSnapshot[] }`
  - `export interface IncomingSubtestSnapshot { name: string; description: string | null; durationSeconds: number; kind: SubtestKind; config: unknown | null; questions: ExistingQuestionSnapshot[] }`
  - `export interface SubtestComparisonResult { changeType: "identik" | "berubah"; existingQuestionCount: number; incomingQuestionCount: number; changedQuestionCount: number; existingDetailedCount: number; incomingDetailedCount: number; losesDetailedExplanations: boolean }`
  - `compareSubtestContent(existing: ExistingSubtestSnapshot, incoming: IncomingSubtestSnapshot): SubtestComparisonResult`
  - `export interface ExplanationSpotCheck { subtestSlug: string; subtestName: string; number: number; correctOption: string; dbPromptSnippet: string; incomingSnippet: string; alreadyHasDetailed: boolean }`
  - `export interface ExplanationEntryInput { number: number; correctIndex: number; prompt?: string; explanation?: string; steps?: string[]; wrongNotes?: string[]; quickTip?: string }`
  - `export interface ExplanationSubtestComparison { changeType: SubtestChangeType; existingQuestionCount: number; incomingCount: number; coverageMismatch: boolean; existingDetailedOverwriteCount: number; spotChecks: ExplanationSpotCheck[]; promptMismatchErrors: string[] }`
  - `compareExplanationSubtest(subtestSlug: string, subtestName: string, existingQuestions: ExistingQuestionSnapshot[], incomingEntries: ExplanationEntryInput[]): ExplanationSubtestComparison`
  - `export interface MetadataDiffResult { changed: boolean; warnings: string[] }`
  - `compareContainerMetadata(label: "Perusahaan" | "Paket", existing: { name: string; description: string | null }, incoming: { name: string; description?: string }): MetadataDiffResult`
  - `validatePackageUpdateInput(input: unknown): { ok: true; data: { name: string; description: string | null } } | { ok: false; error: string }`
  - `validateSubtestUpdateInput(input: unknown, kind: SubtestKind, currentDurationSeconds: number): { ok: true; data: { name: string; durationSeconds: number } } | { ok: false; error: string }`

- [ ] **Step 1: Write failing unit tests in `src/lib/import-analysis.test.ts`**

Create `src/lib/import-analysis.test.ts` with `node:test` and `node:assert/strict` covering:
1. `computeCanonicalHash`: returns identical 64-char hex hash for `{ b: 2, a: { d: 4, c: 3 } }` and `{ a: { c: 3, d: 4 }, b: 2 }`; differs when a value or array order changes.
2. `hasDetailedExplanation`: `false` for `{ steps: null, wrongNotes: null, quickTip: null }` and `{ steps: [], wrongNotes: ["", ""], quickTip: "  " }`; `true` when `steps` has a non-empty string, OR `wrongNotes` has at least one non-empty string, OR `quickTip` is non-empty.
3. `compareSubtestContent`:
   - Identical QUIZ subtest (even with different key order in nested objects) -> `changeType: "identik"`, `changedQuestionCount: 0`, `losesDetailedExplanations: false`.
   - Updated QUIZ subtest that drops `steps`/`quickTip` on questions that previously had them -> `changeType: "berubah"`, `existingDetailedCount: 1`, `incomingDetailedCount: 0`, `losesDetailedExplanations: true`.
   - Non-QUIZ (`PAULI`/`PERSONALITY`) subtest comparing `config` key-order insensitively -> `"identik"` when same config, `"berubah"` when `config` changes.
4. `compareContainerMetadata`:
   - Omitting `incoming.description` (`undefined`) when DB has `"Deskripsi lama"` -> `changed: false`, `warnings: []`.
   - Changing `incoming.name` -> `changed: true`, warning mentions old and new names.
5. `compareExplanationSubtest`:
   - Legacy entry without `prompt` matching DB question without existing detailed explanation -> `changeType: "baru"`, `existingDetailedOverwriteCount: 0`, `promptMismatchErrors: []`, produces `spotChecks` with DB prompt snippet and incoming snippet.
   - Entry identical to existing DB detailed explanation -> `changeType: "identik"`.
   - Entry overwriting existing detailed explanation + fewer entries than DB questions -> `changeType: "berubah"`, `existingDetailedOverwriteCount: 1`, `coverageMismatch: true`.
   - Optional `prompt` with extra whitespace matching DB -> accepted; optional `prompt` with different wording -> recorded in `promptMismatchErrors`.
6. `validatePackageUpdateInput` & `validateSubtestUpdateInput`:
   - Package: trims `name`, converts empty/whitespace `description` to `null`, rejects empty `name` or `name.length > 160` or `description.length > 1000`.
   - Subtest `QUIZ`/`PERSONALITY`: accepts integer `durationSeconds` in `10..10800`, rejects `9`, `10801`, non-integer, or missing `durationSeconds`.
   - Subtest `PAULI`/`DRAWING`: accepts `{ name: "Pauli Baru" }` (omitting `durationSeconds`) or matching `currentDurationSeconds`, returns `currentDurationSeconds`; rejects a different `durationSeconds` with an error explaining duration follows JSON config.
7. `sanitizeImportFileName`: strips path separators (`/` and `\`) and control chars, returns `null` for empty/blank input, caps length to 180 chars.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/import-analysis.test.ts`
Expected: FAIL (`Cannot find module './import-analysis'`).

- [ ] **Step 3: Implement `src/lib/import-analysis.ts`**

Implement all exported types and pure functions listed in **Interfaces**:
- `computeCanonicalHash`: recursively canonicalize plain objects (sorting keys alphabetically, omitting `undefined` properties to match `JSON.stringify` behavior, preserving array order), `JSON.stringify`, then `createHash("sha256").update(...).digest("hex")`.
- `hasDetailedExplanation`: `true` if `steps` contains any non-empty trimmed string, OR `wrongNotes` contains any non-empty trimmed string, OR `quickTip` has a non-empty trimmed string.
- `compareSubtestContent`: compare normalized subtest metadata + canonicalized `config` + canonicalized `questions` array; count per-index question differences (`changedQuestionCount`) and detailed explanation counts (`existingDetailedCount`, `incomingDetailedCount`, `losesDetailedExplanations = existingDetailedCount > 0 && incomingDetailedCount < existingDetailedCount`).
- `compareExplanationSubtest`: for each `incomingEntries` item matching `existingQuestions` by `orderIndex`, validate optional `prompt` via `normalizePromptText`, check whether incoming fields (`COALESCE` semantics: omitted fields keep existing DB value) would actually change any DB column, track `existingDetailedOverwriteCount`, set `coverageMismatch = incomingEntries.length !== existingQuestions.length`, and build up to 3 `spotChecks` (truncating prompt & incoming snippets to 110 chars with `…`).
- `validatePackageUpdateInput` & `validateSubtestUpdateInput`: enforce exact bounds (`name`: 1–160 chars, `description`: max 1000 chars, `durationSeconds`: integer 10–10800 for `QUIZ`/`PERSONALITY`; locked to `currentDurationSeconds` for `PAULI`/`DRAWING`).

- [ ] **Step 4: Run all tests to verify they pass**

Run: `npx tsx --test src/lib/*.test.ts`
Expected: PASS (all new tests + existing 13 tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/lib/import-analysis.ts src/lib/import-analysis.test.ts
git commit -m "feat: add pure import analysis, diff, and edit validation helpers"
```

---

### Task 2: Database Schema (`import_audit_logs`), Audit Log Store & Admin Query Extensions

**Files:**
- Modify: `db/schema.sql:108-112`
- Modify: `src/lib/types.ts:329-352`
- Create: `src/lib/audit-log.ts`
- Test: `src/lib/audit-log.test.ts`
- Modify: `src/lib/queries.ts:537-634`

**Interfaces:**
- Consumes: `databasePool` from `./db`; `SubtestKind` from `./types`.
- Produces:
  - In `src/lib/types.ts`:
    - `export type AuditActionType = "PACK_NEW" | "PACK_OVERWRITE" | "PACK_DUPLICATE_FORCED" | "EXPLANATION_NEW" | "EXPLANATION_OVERWRITE" | "EXPLANATION_DUPLICATE_FORCED" | "IMPORT_REJECTED" | "IMPORT_FAILED" | "PACKAGE_UPDATED" | "SUBTEST_UPDATED" | "PACKAGE_DELETED" | "SUBTEST_DELETED"`
    - `export type AuditStatus = "SUCCESS" | "FORCED" | "REJECTED" | "FAILED"`
    - `export interface ImportAuditLogEntry { id: number; createdAt: string; actionType: AuditActionType; status: AuditStatus; companySlug: string | null; packageSlug: string | null; targetLabel: string | null; fileName: string | null; contentHash: string | null; forcedOverwrite: boolean; summary: Record<string, unknown> }`
    - `AdminPackage` gains `description: string | null`
    - `AdminSubtest` gains `detailedExplanationCount: number`
  - In `src/lib/audit-log.ts`:
    - `export function isUndefinedTableError(error: unknown): boolean`
    - `export interface RecordAuditLogInput { actionType: AuditActionType; status: AuditStatus; companySlug?: string | null; packageSlug?: string | null; targetLabel?: string | null; fileName?: string | null; contentHash?: string | null; forcedOverwrite?: boolean; summary?: Record<string, unknown> }`
    - `export async function recordAuditLog(input: RecordAuditLogInput, queryFn?: QueryExecutor): Promise<void>`
    - `export async function findPreviousSuccessfulUpload(contentHash: string, queryFn?: QueryExecutor): Promise<{ createdAt: string; fileName: string | null } | null>`
    - `export async function listAuditLogs(limit?: number, queryFn?: QueryExecutor): Promise<{ logs: ImportAuditLogEntry[]; migrationRequired: boolean }>`
  - In `src/lib/queries.ts`:
    - `getAdminOverview()` populates `package.description` and `subtest.detailedExplanationCount`
    - `updatePackageMetadata(packageId: number, input: { name: string; description: string | null }): Promise<{ companySlug: string; packageSlug: string; before: { name: string; description: string | null }; after: { name: string; description: string | null } } | null>`
    - `getSubtestForEdit(subtestId: number): Promise<{ id: number; slug: string; name: string; durationSeconds: number; kind: SubtestKind; companySlug: string; packageSlug: string; packageName: string } | null>`
    - `updateSubtestMetadata(subtestId: number, input: { name: string; durationSeconds: number }): Promise<boolean>`
    - `deletePackage(packageId: number): Promise<{ companySlug: string; companyName: string; packageSlug: string; packageName: string } | null>`
    - `deleteSubtest(subtestId: number): Promise<{ companySlug: string; packageSlug: string; packageName: string; subtestSlug: string; subtestName: string } | null>`

- [ ] **Step 1: Write failing unit test in `src/lib/audit-log.test.ts` (pins Review Focus #5)**

Test `isUndefinedTableError`, `recordAuditLog`, `findPreviousSuccessfulUpload`, and `listAuditLogs` using an injected mock `queryFn` that rejects with `{ code: "42P01" }`:
- `isUndefinedTableError({ code: "42P01" })` === `true`; `isUndefinedTableError({ code: "23505" })` === `false`.
- `recordAuditLog(..., throwing42P01)` resolves without throwing.
- `findPreviousSuccessfulUpload("abc", throwing42P01)` resolves to `null`.
- `listAuditLogs(100, throwing42P01)` resolves to `{ logs: [], migrationRequired: true }`.
- `listAuditLogs(50, throwingOtherError)` rejects (non-`42P01` errors still propagate).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/audit-log.test.ts`
Expected: FAIL (`Cannot find module './audit-log'`).

- [ ] **Step 3: Update `db/schema.sql` and `src/lib/types.ts`**

- Append the idempotent `CREATE TABLE IF NOT EXISTS import_audit_logs (...)` and both indexes (`import_audit_logs_created_at_idx`, `import_audit_logs_hash_status_idx`) from Spec §5.1 to `db/schema.sql`.
- Add `AuditActionType`, `AuditStatus`, `ImportAuditLogEntry`, `AdminPackage.description`, and `AdminSubtest.detailedExplanationCount` in `src/lib/types.ts`.

- [ ] **Step 4: Implement `src/lib/audit-log.ts`**

Implement `QueryExecutor = (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>` defaulting to `(text, values) => databasePool.query(text, values)`. Handle PostgreSQL `42P01` safely in `recordAuditLog` (`console.warn` + return), `findPreviousSuccessfulUpload` (return `null`), and `listAuditLogs` (return `{ logs: [], migrationRequired: true }`). Limit `listAuditLogs` to `Math.min(Math.max(1, limit ?? 100), 200)`.

- [ ] **Step 5: Extend `src/lib/queries.ts`**

- Update `getAdminOverview()`: select `p.description AS package_description` and subquery `detailed_explanation_count` counting `questions` where `s.kind = 'QUIZ'` and (`(jsonb_typeof(q.steps) = 'array' AND jsonb_array_length(q.steps) > 0) OR (jsonb_typeof(q.wrong_notes) = 'array' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q.wrong_notes) AS note WHERE btrim(note) <> '')) OR (q.quick_tip IS NOT NULL AND btrim(q.quick_tip) <> '')`).
- Add `updatePackageMetadata`, `getSubtestForEdit`, and `updateSubtestMetadata`.
- Update `deletePackage` and `deleteSubtest` to fetch the target's company/package/subtest slugs & names inside the delete operation and return that metadata (or `null` if not found). Note: update `src/app/api/admin/packs/[packageId]/route.ts` and `src/app/api/admin/subtests/[subtestId]/route.ts` callers in Task 3 (their boolean truthiness checks `deleted ? ...` already remain valid because an object is truthy and `null` is falsy!).

- [ ] **Step 6: Run tests and typecheck**

Run: `npx tsx --test src/lib/*.test.ts ; npx tsc --noEmit`
Expected: PASS (0 test failures, 0 TS errors).

- [ ] **Step 7: Commit**

```bash
git add db/schema.sql src/lib/types.ts src/lib/audit-log.ts src/lib/audit-log.test.ts src/lib/queries.ts
git commit -m "feat: add import_audit_logs schema, fail-safe audit store, and admin query extensions"
```

---

### Task 3: Import Engine Safeguards, Server-Enforced Force Gate & Admin API Routes

**Files:**
- Modify: `src/lib/pack-import.ts`
- Modify: `src/lib/explanation-pack.ts`
- Modify: `scripts/import-packs.ts`
- Modify: `src/app/api/admin/packs/route.ts`
- Create: `src/app/api/admin/packs/reject/route.ts`
- Modify: `src/app/api/admin/packs/[packageId]/route.ts`
- Modify: `src/app/api/admin/subtests/[subtestId]/route.ts`

**Interfaces:**
- Consumes: Task 1 (`computeCanonicalHash`, `compareSubtestContent`, `compareExplanationSubtest`, `compareContainerMetadata`, `sanitizeImportFileName`, `validatePackageUpdateInput`, `validateSubtestUpdateInput`); Task 2 (`recordAuditLog`, `findPreviousSuccessfulUpload`, `updatePackageMetadata`, `getSubtestForEdit`, `updateSubtestMetadata`, `deletePackage`, `deleteSubtest`).
- Produces:
  - In `src/lib/pack-import.ts`:
    - `export class ImportConfirmationRequiredError extends Error { readonly summary: ImportSummary }`
    - Extended `ImportedSubtestSummary`: adds `changeType: "baru" | "identik" | "berubah"`, `existingQuestionCount: number`, `changedQuestionCount: number`, `existingDetailedCount: number`, `incomingDetailedCount: number`, `losesDetailedExplanations: boolean`, `coverageMismatch?: boolean`, `existingDetailedOverwriteCount?: number`.
    - Extended `ImportSummary`: adds `companySlug: string`, `packageSlug: string`, `contentHash: string`, `isDuplicateContent: boolean`, `previousUploadAt: string | null`, `hasOverwrite: boolean`, `metadataChanged: boolean`, `requiresConfirmation: boolean`, `warnings: string[]`, `spotChecks?: ExplanationSpotCheck[]`.
    - `importPack(pack: PackFile, options: { dryRun: boolean; force?: boolean; contentHash?: string }): Promise<ImportSummary>`
  - In `src/lib/explanation-pack.ts`:
    - `ExplanationEntry` gains optional `prompt?: string`.
    - `importExplanations(pack: ExplanationPackFile, options: { dryRun: boolean; force?: boolean; contentHash?: string }): Promise<ImportSummary>`
  - API Contracts:
    - `POST /api/admin/packs?dryRun=1&force=1` (header `X-Import-Filename` optional): returns `200 { summary }`, `409 { requiresConfirmation: true, summary, errors }`, `400/413/500 { errors }`.
    - `POST /api/admin/packs/reject`: returns `200 { ok: true }`.
    - `PATCH /api/admin/packs/[packageId]`: returns `200 { ok: true, package: { id, name, description } }` or `400/404 { error }`.
    - `PATCH /api/admin/subtests/[subtestId]`: returns `200 { ok: true, subtest: { id, name, durationSeconds } }` or `400/404 { error }`.

- [ ] **Step 1: Upgrade `src/lib/pack-import.ts`**

- Export `ImportConfirmationRequiredError` and extend `ImportedSubtestSummary` / `ImportSummary` per **Interfaces**.
- Compute `contentHash = options.contentHash ?? computeCanonicalHash(pack)` and call `findPreviousSuccessfulUpload(contentHash)` before/outside transaction.
- When `existingCompany` or `existingPackage` exists:
  - Compare metadata via `compareContainerMetadata`.
  - Use `COALESCE($3, description)` (passing `pack.company.description ?? null` ONLY when `pack.company.description !== undefined`, or passing a boolean flag) so omitted `description: undefined` preserves existing DB `description` instead of overwriting with `NULL` (pins Review Focus #2).
- For each subtest:
  - If existing, query `subtests` row + existing `questions` ordered by `order_index`, map options `label` + `correctIndex`, and call `compareSubtestContent`.
  - If `comparison.changeType === "identik"`: **skip** `UPDATE subtests` and `DELETE FROM questions` so learner `answers` stay untouched (`replacedAttemptCount = 0`).
  - If `comparison.changeType === "berubah"`: query `replacedAttemptCount`, update `subtests`, replace `questions`, and collect warnings (attempt detail loss + `losesDetailedExplanations`).
- Compute `allSubtestsIdentical`, `isDuplicateContent = allSubtestsIdentical && !metadataChanged`, `hasOverwrite = subtests.some(s => s.changeType === "berubah") || metadataChanged`, `requiresConfirmation = isDuplicateContent || hasOverwrite`.
- Build Indonesian `warnings` (duplicate with `previousUploadAt` if found, metadata diffs, replaced attempts, lost detailed explanations).
- Before commit: if `!options.dryRun && requiresConfirmation && !options.force`, `ROLLBACK` and throw `new ImportConfirmationRequiredError(summary)`.

- [ ] **Step 2: Upgrade `src/lib/explanation-pack.ts`**

- Add optional `prompt?: string` to `ExplanationEntry`; in `validateExplanationPack`, validate that if `entry.prompt !== undefined`, it is a non-empty string.
- In `importExplanations(pack, options)`:
  - Compute `contentHash = options.contentHash ?? computeCanonicalHash(pack)` and look up `previousUploadAt`.
  - Select `id, order_index, type, prompt, image_svg, options, correct_option, explanation, steps, wrong_notes, quick_tip` from `questions`.
  - After existing number/`correctIndex`/`wrongNotes.length` checks, call `compareExplanationSubtest` to check optional `prompt` mismatches (pushing any `promptMismatchErrors` into `problems` so they hard-fail via `ExplanationImportError`), `coverageMismatch`, `existingDetailedOverwriteCount`, `changeType`, and `spotChecks` (cap total `spotChecks` across subtests at 6).
  - Skip `UPDATE questions` statements for subtests with `changeType === "identik"`.
  - Set `isDuplicateContent = summaries.every(s => s.changeType === "identik")`, `hasOverwrite = summaries.some(s => (s.existingDetailedOverwriteCount ?? 0) > 0)`, `hasCoverageMismatch = summaries.some(s => s.coverageMismatch)`, `requiresConfirmation = isDuplicateContent || hasOverwrite || hasCoverageMismatch`.
  - Build Indonesian `warnings` (duplicate with `previousUploadAt`, overwriting existing detailed explanations, partial coverage mismatch).
  - Before commit: if `!options.dryRun && requiresConfirmation && !options.force`, `ROLLBACK` and throw `new ImportConfirmationRequiredError(summary)`.

- [ ] **Step 3: Update `scripts/import-packs.ts`**

Pass `{ dryRun: false, force: true }` to `importPack` so CLI imports remain non-interactive and skip identical subtests safely.

- [ ] **Step 4: Upgrade `src/app/api/admin/packs/route.ts` and add `src/app/api/admin/packs/reject/route.ts`**

- In `src/app/api/admin/packs/route.ts`:
  - Read `dryRun = searchParams.get("dryRun") === "1"`, `force = searchParams.get("force") === "1"`, and `fileName = sanitizeImportFileName(request.headers.get("x-import-filename"))`.
  - Compute `contentHash = computeCanonicalHash(parsed)` once parsed.
  - On `ImportConfirmationRequiredError`: return HTTP `409` `{ requiresConfirmation: true, summary: error.summary, errors: ["Konfirmasi timpa paksa diperlukan sebelum menyimpan."] }` (no audit log).
  - When `!dryRun`, call `recordAuditLog`:
    - On pack success: `actionType = summary.isDuplicateContent ? "PACK_DUPLICATE_FORCED" : summary.hasOverwrite ? "PACK_OVERWRITE" : "PACK_NEW"`, `forcedOverwrite = summary.requiresConfirmation && force`, `status = forcedOverwrite ? "FORCED" : "SUCCESS"`.
    - On explanation success: `actionType = summary.isDuplicateContent ? "EXPLANATION_DUPLICATE_FORCED" : summary.hasOverwrite ? "EXPLANATION_OVERWRITE" : "EXPLANATION_NEW"`, `forcedOverwrite = summary.requiresConfirmation && force`, `status = forcedOverwrite ? "FORCED" : "SUCCESS"`.
    - On any failure when `!dryRun` (JSON parse error, validation error, `ExplanationImportError`, DB error): `actionType: "IMPORT_FAILED"`, `status: "FAILED"`, `summary: { errors: errors.slice(0, 10) }`.
- Create `src/app/api/admin/packs/reject/route.ts`:
  - `POST` checks `rejectIfNotAdmin()`, parses optional metadata `{ mode, companySlug, packageSlug, targetLabel, fileName, contentHash, warnings }`, sanitizes strings, calls `recordAuditLog` with `actionType: "IMPORT_REJECTED"`, `status: "REJECTED"`, returns `{ ok: true }`.

- [ ] **Step 5: Add `PATCH` and audit logging to `[packageId]/route.ts` and `[subtestId]/route.ts`**

- In `src/app/api/admin/packs/[packageId]/route.ts`:
  - Add `PATCH(request, context)`: `rejectIfNotAdmin()`, validate `packageId`, parse body, `validatePackageUpdateInput(body)`, call `updatePackageMetadata`, record `PACKAGE_UPDATED` (`status: "SUCCESS"`, `summary: { before, after }`), return `{ ok: true, package: { id: packageId, ...after } }`.
  - Update `DELETE`: capture returned metadata from `deletePackage(packageId)` and record `PACKAGE_DELETED` when deleted.
- In `src/app/api/admin/subtests/[subtestId]/route.ts`:
  - Add `PATCH(request, context)`: `rejectIfNotAdmin()`, validate `subtestId`, fetch `existing = await getSubtestForEdit(subtestId)` (`404` if null), `validateSubtestUpdateInput(body, existing.kind, existing.durationSeconds)`, call `updateSubtestMetadata`, record `SUBTEST_UPDATED` (`status: "SUCCESS"`, `summary: { before: { name, durationSeconds }, after: ... }`), return `{ ok: true, subtest: { id: subtestId, ...data } }`.
  - Update `DELETE`: capture returned metadata from `deleteSubtest(subtestId)` and record `SUBTEST_DELETED` when deleted.

- [ ] **Step 6: Run tests, typecheck, and lint**

Run: `npx tsx --test src/lib/*.test.ts ; npx tsc --noEmit ; npx eslint src/`
Expected: PASS (0 errors, 0 warnings).

- [ ] **Step 7: Commit**

```bash
git add src/lib/pack-import.ts src/lib/explanation-pack.ts scripts/import-packs.ts src/app/api/admin/packs/route.ts src/app/api/admin/packs/reject/route.ts src/app/api/admin/packs/[packageId]/route.ts src/app/api/admin/subtests/[subtestId]/route.ts
git commit -m "feat: enforce import duplicate/overwrite safety, inline PATCH APIs, and audit logging"
```

---

### Task 4: Solid Cobalt CMS Sidebar Shell & Dashboard with Explanation Status and Inline Editing

**Files:**
- Modify: `src/components/ui/Icons.tsx`
- Modify: `src/components/admin/AdminShell.tsx`
- Modify: `src/components/admin/AdminDashboardClient.tsx`

**Interfaces:**
- Consumes: `AdminCompany`, `AdminPackage`, `AdminSubtest`, `SUBTEST_KIND_LABEL`, `SUBTEST_UNIT` from `@/lib/types`; `getCompanyMonogram` from `@/lib/dashboard-helpers`; `PATCH /api/admin/packs/[packageId]` and `PATCH /api/admin/subtests/[subtestId]` from Task 3.
- Produces:
  - `IconEdit`, `IconClipboardList` exported from `src/components/ui/Icons.tsx`.
  - `AdminShell({ activeNav: "dashboard" | "import" | "audit", children: React.ReactNode })` exported from `src/components/admin/AdminShell.tsx`.
  - Upgraded `AdminDashboardClient({ companies: AdminCompany[] })`.

- [ ] **Step 1: Add `IconEdit` and `IconClipboardList` to `src/components/ui/Icons.tsx`**

Follow the existing `baseProps(props)` SVG convention in `Icons.tsx`.

- [ ] **Step 2: Redesign `src/components/admin/AdminShell.tsx` as Solid Cobalt left sidebar**

Mirror `src/components/layout/LearnerShell.tsx` structure and accessibility:
- `"use client"` with fixed `w-[248px]` desktop sidebar (`border-r border-line-strong bg-surface`), `lg:pl-[248px]`, `max-w-6xl` main container.
- Mobile sticky topbar + slide-in drawer (`role="dialog"`, `aria-modal="true"`), `Escape` key handler, and focus shift (`menuButtonRef`, `closeDrawerButtonRef`, `wasMobileOpenRef`).
- Brand header: `eA` Cobalt badge + `e-assessment` + `Admin` shield pill.
- 3 nav links with Solid Cobalt active state (`bg-brand font-bold text-white shadow-xs`):
  1. **Paket & Subtes** (`/admin`, `IconDashboard`)
  2. **Impor JSON** (`/admin/import`, `IconUpload`)
  3. **Audit Log** (`/admin/audit`, `IconClipboardList`)
- Sidebar footer: `ThemeToggle`, full-width **Lihat Situs** (`/`) link, and `LogoutButton`.

- [ ] **Step 3: Upgrade `src/components/admin/AdminDashboardClient.tsx`**

- Compute metrics across `companies`: total companies, total packages, total subtests, and `QUIZ`-only explanation coverage (`detailedQuizQuestions / totalQuizQuestions`, percentage).
- Render firm Solid Cobalt-styled header + quick actions (**Contoh JSON**, **Audit Log**, **Impor JSON**), and 4-column summary strip (`border-line-strong`) showing **Perusahaan**, **Paket**, **Subtes**, and **Pembahasan Rinci** (`XX% · A/B soal`).
- Add filter bar: search input + 3 explanation filter buttons (`Semua`, `Perlu Pembahasan`, `Lengkap`) with `aria-pressed`.
- Render company cards with bold monogram (`getCompanyMonogram(company.name)`), slug badge, and package count.
- For each package:
  - Display name (link to `/c/...`), slug, description (if present), subtest/item counts, and explanation status badge (`Lengkap X/X` emerald, `Parsial X/Y` amber, `Belum Ada 0/Y` rose/amber, or `Non-Kuis` subtle when package has 0 `QUIZ` questions).
  - Package actions: **Edit** (`IconEdit`), **Impor Pembahasan** (`/admin/import`), **Ekspor JSON**, **Hapus** (`DeleteButton`).
  - Inline Package Editor toggled by **Edit**: Name input (required, max 160), Description textarea (max 1000), Save/Cancel buttons calling `PATCH /api/admin/packs/${pkg.id}`, showing inline error on failure and calling `router.refresh()` on success.
- For each subtest row:
  - Display name, slug, kind pill for non-`QUIZ` (`SUBTEST_KIND_LABEL`), item count + unit, duration (formatted cleanly in minutes or seconds), explanation completeness badge for `QUIZ` (`X/Y Lengkap`, `X/Y Parsial`, `Belum Ada`), **Edit** button, and `DeleteButton`.
  - Inline Subtest Editor toggled by **Edit**: Name input + Duration control:
    - For `QUIZ`/`PERSONALITY`: if `durationSeconds >= 60 && durationSeconds % 60 === 0`, show minutes input (`1–180 menit`, converting `* 60` on save); otherwise show seconds input (`10–10800 detik`) so non-minute durations never lose precision.
    - For `PAULI`/`DRAWING`: disable duration input and show concise helper text *"Durasi mengikuti config JSON"*, sending `{ name }` only on `PATCH /api/admin/subtests/${subtest.id}`.

- [ ] **Step 4: Run typecheck and lint**

Run: `npx tsc --noEmit ; npx eslint src/`
Expected: PASS (0 errors, 0 warnings).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Icons.tsx src/components/admin/AdminShell.tsx src/components/admin/AdminDashboardClient.tsx
git commit -m "feat: redesign CMS AdminShell sidebar and AdminDashboardClient with explanation status and inline edit"
```

---

### Task 5: Safe Importer Confirmation UI & `/admin/audit` Page

**Files:**
- Modify: `src/components/admin/PackImporter.tsx`
- Modify: `src/app/admin/import/page.tsx`
- Create: `src/components/admin/AuditLogView.tsx`
- Create: `src/app/admin/audit/page.tsx`

**Interfaces:**
- Consumes: `ImportSummary` from `@/lib/pack-import`; `ImportAuditLogEntry`, `SUBTEST_UNIT`, `SUBTEST_KIND_LABEL` from `@/lib/types`; `listAuditLogs` from `@/lib/audit-log`; `AdminShell` from `@/components/admin/AdminShell`; `POST /api/admin/packs` and `POST /api/admin/packs/reject` from Task 3.
- Produces:
  - Upgraded `PackImporter` with diff breakdown table, explanation spot-check preview, force-overwrite checkbox gate, and reject-with-audit action.
  - `/admin/audit` route rendering `AuditLogView`.

- [ ] **Step 1: Upgrade `src/components/admin/PackImporter.tsx` and `src/app/admin/import/page.tsx`**

- In `PackImporter.tsx`:
  - Send `X-Import-Filename` header (when `fileMeta?.name` is set) on both dry-run and real import requests.
  - Add states: `forceConfirmed: boolean` (reset to `false` on any JSON edit or new dry-run), `isRejecting: boolean`, `rejectedNotice: string | null`, plus a ref to focus the confirmation panel / error alert cleanly.
  - Handle HTTP `409` from `POST /api/admin/packs` by updating `summary` from response body, setting `stage = "previewed"`, `forceConfirmed = false`, and surfacing the confirmation gate.
  - Render redesigned preview card (`border-line-strong`):
    - Header with mode pill (`Paket Soal` vs `Pembahasan Saja`), short 8-char hash (`summary.contentHash.slice(0, 8)`), and previous upload date if `summary.previousUploadAt` is present.
    - Responsive diff table per subtest: Subtes, Kondisi Database vs File Diunggah, and Dampak badge (`Subtes baru`, `Identik · dilewati`, `Soal diganti (+X / Y berubah)`, `Pembahasan diperbarui`, `Pembahasan rinci hilang!`, attempt impact).
    - When `summary.mode === "pembahasan"` and `summary.spotChecks?.length`: render **Cek Kecocokan Sampel Soal** panel listing each spot-check item (subtest, soal `#N`, kunci DB `A–E`, DB prompt snippet, incoming explanation snippet, and badge if question already has detailed explanation).
    - When `summary.requiresConfirmation`:
      - High-contrast warning alert box (rose/red when destructive overwrite/loss of detailed explanations/attempt impact, amber when pure duplicate/coverage warning) listing `summary.warnings`.
      - Mandatory checkbox: *"Saya memahami dampak penimpaan ini dan tetap ingin melanjutkan impor."*
      - Action bar: **"Tolak / Batalkan Impor"** (calls `POST /api/admin/packs/reject` best-effort, clears preview, shows `rejectedNotice` confirmation banner) and **"Timpa Paksa (Force Overwrite)"** (red solid button, `disabled={isBusy || !forceConfirmed}`, sends `POST /api/admin/packs?force=1`).
    - When `!summary.requiresConfirmation`: Solid Cobalt **"Simpan ke Database"** button (`POST /api/admin/packs`).
    - When `stage === "done"`: show success banner with links to `/admin` (**Lihat Paket Soal**) and `/admin/audit` (**Lihat Audit Log**).
- In `src/app/admin/import/page.tsx`: tighten header copy to reflect automatic detection of paket soal & `pembahasanSaja` plus duplicate/diff safety checks, and keep `activeNav="import"`.

- [ ] **Step 2: Create `src/components/admin/AuditLogView.tsx` and `src/app/admin/audit/page.tsx`**

- In `src/app/admin/audit/page.tsx`:
  - `export const dynamic = "force-dynamic"`.
  - Check `isAdminConfigured()` (redirect `/admin` if false) and `isAdminAuthenticated()` (`redirect("/admin")` if false).
  - Fetch `{ logs, migrationRequired } = await listAuditLogs(100)`.
  - Render `<AdminShell activeNav="audit"><AuditLogView logs={logs} migrationRequired={migrationRequired} /></AdminShell>`.
- In `src/components/admin/AuditLogView.tsx` (`"use client"`):
  - If `migrationRequired`: render an amber/cobalt instruction card explaining that tabel `import_audit_logs` belum tersedia dan tampilkan perintah `npm run db:migrate`.
  - Otherwise render:
    - Header + quick link to `/admin/import`.
    - Compact 4-stat strip (Total Tercatat, Sukses, Timpa Paksa, Ditolak/Gagal).
    - Client filters: Category pills (`Semua`, `Impor Soal`, `Impor Pembahasan`, `Edit & Hapus`), Status select/pills (`Semua`, `Sukses`, `Timpa Paksa`, `Ditolak`, `Gagal`), and search box (target paket / nama file / hash).
    - Responsive log list (desktop `<table>` + mobile stacked cards) showing: formatted WIB/local timestamp (`id-ID`), Indonesian action badge (`Impor Paket Baru`, `Timpa Paket`, `Duplikat Dipaksa`, `Impor Pembahasan`, `Timpa Pembahasan`, `Pembahasan Duplikat`, `Impor Ditolak`, `Impor Gagal`, `Edit Paket`, `Edit Subtes`, `Hapus Paket`, `Hapus Subtes`), Target (`companySlug / packageSlug` + `targetLabel`), File & short 8-char hash (`font-mono`), concise Indonesian summary derived from `entry.summary`, and WCAG-compliant status badge (`SUKSES`, `TIMPA PAKSA`, `DITOLAK`, `GAGAL`).

- [ ] **Step 3: Full verification suite (tests, typecheck, lint, production build)**

Run: `npx tsx --test src/lib/*.test.ts && npx tsc --noEmit && npx eslint src/ && npm run build`
Expected: All unit tests pass, `tsc --noEmit` exits 0, `eslint src/` exits 0 with 0 warnings, and `npm run build` succeeds showing `/admin`, `/admin/import`, `/admin/audit`, `/api/admin/packs`, `/api/admin/packs/reject`, `/api/admin/packs/[packageId]`, and `/api/admin/subtests/[subtestId]`.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/PackImporter.tsx src/app/admin/import/page.tsx src/components/admin/AuditLogView.tsx src/app/admin/audit/page.tsx
git commit -m "feat: add diff/spot-check confirmation importer UI and /admin/audit page"
```
