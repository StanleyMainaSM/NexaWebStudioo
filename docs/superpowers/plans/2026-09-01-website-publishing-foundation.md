# Website Publishing Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one secure publishing boundary for existing generated Website Creation artifacts while preserving the existing specification, generator, template system, and renderer.

**Architecture:** The existing generated artifact table remains the versioned output store. A single authenticated RPC transitions an existing current artifact to `published`, enforces stale protection and one published artifact per Creation Project, and records publication time. Studio calls that boundary and the existing preview routes/rendering remain unchanged except for the minimum artifact-state integration.

**Tech Stack:** React + TypeScript + Vite, Supabase/PostgreSQL RPC + RLS, Node test scripts.

**Spec:** `docs/superpowers/specs/2026-09-01-avelixa-website-publishing-foundation.md`

## Global Constraints

- Work only on `avelixa-current-work`.
- Do not deploy production or modify production Supabase.
- Keep exactly one authoritative `WebsiteSpecification`.
- Keep one generation boundary, one template system, one generated artifact model, and one renderer.
- Do not modify unrelated systems or the known `cron.job` migration chain.

---

### Task 1: Establish failing publishing regression coverage

**Files:**
- Create: `tests/websiteCreationPublishing.test.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/avelixa-build.yml`

**Interfaces:**
- Tests will consume `WebsiteOutputStatus`, deterministic identity helpers, and the existing artifact/public-preview migration files.
- The test will assert the existence and security shape of the publishing RPC before implementation.

- [ ] **Step 1: Write the failing test**

Create focused assertions for: authenticated publishing boundary, anonymous rejection, stale identity comparison, `published` status, `published_at`, one published artifact per project, idempotency, preservation of historical artifacts, and preview handling. Use the repository's existing migration/text-test style so the test is executable without requiring a live database for structural assertions.

- [ ] **Step 2: Run the test to verify it fails**

Run:
```powershell
node --experimental-strip-types tests/websiteCreationPublishing.test.mjs
```
Expected: FAIL because the publishing migration/RPC and Studio integration do not yet exist.

- [ ] **Step 3: Register the test**

Add:
```json
"test:website-creation-publishing": "node --experimental-strip-types tests/websiteCreationPublishing.test.mjs"
```
without removing existing Website Creation scripts, and append the command to the Website Creation CI test group.

- [ ] **Step 4: Run the focused test again**

Run the same command and confirm the failure is still specifically caused by missing publishing behavior rather than a test syntax error.

- [ ] **Step 5: Commit**

```bash
git add tests/websiteCreationPublishing.test.mjs package.json .github/workflows/avelixa-build.yml
git commit -m "test: define website publishing lifecycle"
```

---

### Task 2: Add the transactional publishing boundary

**Files:**
- Create: `supabase/migrations/20260901130000_website_creation_publishing.sql`
- Modify: `src/lib/websiteCreation/types.ts`

**Interfaces:**
- RPC: `publish_creation_generated_output(p_creation_project_id UUID, p_output_identity TEXT) RETURNS JSONB`.
- Existing `WebsiteOutputStatus` remains `draft | generated | published`.
- Artifact metadata adds `publishedAt?: string | null` if needed by the existing TypeScript model.

- [ ] **Step 1: Write migration assertions first**

Extend the failing publishing test to require a migration containing `published_at`, an authenticated-only publish RPC, project/artifact authorization checks, stale identity checks, and transactional publication of exactly one artifact.

- [ ] **Step 2: Run the focused test**

Run:
```powershell
npm run test:website-creation-publishing
```
Expected: FAIL because the migration and types are not implemented.

- [ ] **Step 3: Implement the minimum migration**

The migration must add `published_at TIMESTAMPTZ` only if absent; preserve existing RLS; keep direct artifact writes denied; create `publish_creation_generated_output` as an authenticated-only secure boundary; lock the Creation Project row and selected artifact rows; verify the caller is authorized under the same Creation Project rules used by generation; verify the artifact belongs to the project and has `status = 'generated'` or is already `published`; recompute the current specification identity using the existing persisted identity convention available to SQL, or compare against the project's latest generated identity/version after verifying the artifact is the project's current generated output; reject stale artifacts; set prior published artifact(s) to `generated` only after the target is proven current; set target to `published` and `published_at = COALESCE(existing, NOW())`; return target identity/version/status/publication timestamp. Re-publishing an already-published current artifact returns success without changing its original publication timestamp.

Use `REVOKE ALL ... FROM PUBLIC, anon` and grant execute only to `authenticated`. Do not add permissive artifact write policies.

- [ ] **Step 4: Extend TypeScript types minimally**

Add nullable publication metadata to `PersistedGeneratedWebsiteArtifact` only if the current database row is consumed by TypeScript. Do not create a second artifact interface.

- [ ] **Step 5: Run the focused test**

Run:
```powershell
npm run test:website-creation-publishing
```
Expected: PASS for migration/type assertions.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260901130000_website_creation_publishing.sql src/lib/websiteCreation/types.ts
git commit -m "feat: add secure website artifact publishing boundary"
```

---

### Task 3: Integrate publishing into Studio and lifecycle state

**Files:**
- Modify: `src/pages/WebsiteCreationStudio.tsx`
- Modify: `src/lib/websiteCreation/lifecycle.ts`
- Modify: `tests/websiteCreationPublishing.test.mjs`

**Interfaces:**
- Studio calls `supabase.rpc('publish_creation_generated_output', { p_creation_project_id, p_output_identity })`.
- Lifecycle state continues to be `never_generated | current | needs_regeneration | generation_failed`.
- Artifact status remains `draft | generated | published`.

- [ ] **Step 1: Add failing Studio assertions**

Require the Studio source to expose a publish action only when the lifecycle state is current and to call the single publishing RPC. Require stale state to hide/disable publishing.

- [ ] **Step 2: Run focused test**

Run:
```powershell
npm run test:website-creation-publishing
```
Expected: FAIL until Studio is integrated.

- [ ] **Step 3: Implement minimal Studio integration**

Add a guarded `publishing` state and a `publishWebsite` handler. The handler must refuse to run without an authenticated project, current lifecycle state, and latest generated identity; call the RPC; update local project metadata/status from the response; show a controlled success/error notice; and prevent repeated clicks while publishing. Preserve all existing Generate/Save behavior.

- [ ] **Step 4: Preserve failure semantics**

Do not alter generation failure handling. A failed generation must continue to preserve the previous artifact/publication state. Publishing failure must leave local state unchanged except for a controlled error message.

- [ ] **Step 5: Run focused test and typecheck**

Run:
```powershell
npm run test:website-creation-publishing
npm run typecheck
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/WebsiteCreationStudio.tsx src/lib/websiteCreation/lifecycle.ts tests/websiteCreationPublishing.test.mjs
git commit -m "feat: integrate generated website publishing into Studio"
```

---

### Task 4: Verify preview semantics and full regression suite

**Files:**
- Modify: `src/pages/PublicCreationPreview.tsx` only if the existing artifact resolution needs a minimal published-state adjustment.
- Modify: `tests/websiteCreationPublishing.test.mjs` for preview assertions if required.

**Interfaces:**
- Existing routes remain `/preview/:token` and `/preview/:token/:outputIdentity`.
- Existing `GeneratedWebsitePreview` and `WebsitePreviewRenderer` remain the sole rendering path.

- [ ] **Step 1: Run publishing and Website Creation tests**

Run:
```powershell
npm run test:website-creation-publishing
npm run test:website-creation-foundation
npm run test:website-creation-security
npm run test:website-creation-editor
npm run test:website-creation-studio
npm run test:website-creation-templates
npm run test:website-creation-product
npm run test:website-creation-generation
npm run test:website-creation-preview
npm run test:website-creation-output
npm run test:website-creation-lifecycle
npm run test:website-creation-artifact
```
Expected: PASS for all tests.

- [ ] **Step 2: Run typecheck and build**

Run:
```powershell
npm run typecheck
npm run build
```
Expected: PASS. Existing chunk warnings are unrelated and must not be changed.

- [ ] **Step 3: Run existing application regressions**

Run the repository's existing connector, client, invoice, payment/finance, and other regression commands listed in the CI workflow. Expected: PASS unless an unrelated pre-existing failure occurs.

- [ ] **Step 4: Verify local Supabase if available**

Use the repository's existing Supabase verification workflow. If `cron.job` migration-chain failure recurs, stop there and report it without modifying that migration chain.

- [ ] **Step 5: Inspect browser behavior only if an actual browser environment is available**

Verify Generate → Current → Publish → Refresh → Published, then edit → Needs Regeneration → Publish unavailable, then regenerate → publish newer artifact while preserving historical output. Verify desktop/tablet/mobile and public preview token behavior. Report only actual observations.

- [ ] **Step 6: Final verification before claiming completion**

Confirm no production deployment command was executed, no production database was changed, and no unrelated systems were modified.

- [ ] **Step 7: Commit final verified changes**

```bash
git status
git log -5 --oneline
```
Only report completion after verification evidence exists.
