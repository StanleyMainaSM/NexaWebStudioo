# Connector Onboarding + Owner User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Connector application → approval → provisioning → secure activation → terms → portal lifecycle and make Owner User Management safe, reversible, and fully authorized.

**Architecture:** Preserve the existing Supabase Auth, server-only service-role API, provisioning queue/cron/Edge Function, connector terms gate, and role/RLS model. Use migrations for database changes and the existing server API for privileged Auth operations; do not introduce a second authorization architecture.

**Tech Stack:** React + TypeScript + Vite, Express 5, Supabase Auth/Postgres/Edge Functions, SQL migrations, Node test scripts.

**Spec:** User-provided AVELIXA — COMPLETE CONNECTOR ONBOARDING + OWNER USER MANAGEMENT IMPLEMENTATION prompt in the active development-control conversation.

## Global Constraints

- Work only on `avelixa-current-work`.
- Preserve existing Avelixa functionality and architecture.
- Never expose plaintext passwords, service-role keys, or activation tokens unnecessarily.
- Owner is the only role allowed to manage Owner User Management.
- Normal UI/API cannot assign or remove the Owner role.
- Supported normal roles are `client`, `operator`, `connector`, and `admin`.
- Database changes must be new migrations; never edit an applied migration.
- Do not claim tests/builds pass without actual execution output.

---

### Task 1: Reproduce and diagnose Owner role management

**Files:**
- Inspect: `src/pages/portal/OwnerUserManagement.tsx`
- Inspect: `server.ts`
- Inspect: `private.protect_owner_role()` and `public.user_roles` policies
- Test: Owner management regression tests

- [ ] Trace frontend request → authenticated server user → Owner authorization → target Auth user lookup → role mutation → DB response.
- [ ] Confirm why the reported role assignment failure occurs rather than assuming RLS is the cause.
- [ ] Preserve `private.protect_owner_role()`.

### Task 2: Harden Owner member lifecycle

**Files:**
- Modify: `server.ts`
- Modify: `src/pages/portal/OwnerUserManagement.tsx`
- Create: required SQL migration(s)
- Test: Owner lifecycle regression tests

- [ ] Add safe member status/deactivation support without destructive deletion.
- [ ] Ensure inactive members cannot retain effective application access solely through existing roles/sessions.
- [ ] Keep privileged Auth operations server-side.
- [ ] Keep duplicate-email and partial-account cleanup behavior safe.
- [ ] Ensure Connector role creation/removal keeps `connector_profiles` coherent.

### Task 3: Connector application and provisioning UX/state

**Files:**
- Modify: `src/pages/ConnectorApplication.tsx`
- Modify: `src/pages/portal/ConnectorApplications.tsx`
- Inspect/modify: existing provisioning migration/function only through new migrations where required
- Test: connector application/provisioning lifecycle tests

- [ ] Improve application confirmation copy.
- [ ] Surface provisioning state and activation-email state in management UI.
- [ ] Reconcile historical approved applications with missing queue rows using one coherent mechanism.
- [ ] Remove or consolidate redundant provisioning triggers only when verified safe.

### Task 4: Secure activation and password setup

**Files:**
- Modify: `src/pages/portal/SetPassword.tsx`
- Modify: `src/App.tsx`
- Modify: existing activation/provisioning server or function only as required
- Test: connector activation lifecycle tests

- [ ] Distinguish invalid/expired/missing-session/unexpected activation states without leaking sensitive information.
- [ ] Keep password setup before terms and portal access.
- [ ] Add controlled activation resend with authorization, dedupe/rate limiting, and delivery state.
- [ ] Never send or persist plaintext passwords.

### Task 5: Security hardening

**Files:**
- Create: new SQL migration(s)
- Inspect: connector provisioning/notification tables and policies
- Test: security regression tests

- [ ] Avoid unnecessary persistence/exposure of activation URLs.
- [ ] Safely redact/cleanup old activation links only where active-link invalidation is understood and controlled.
- [ ] Apply the minimum safe treatment to National ID data without inventing insecure encryption.

### Task 6: Verification

- [ ] Run typecheck.
- [ ] Run build.
- [ ] Run connector lifecycle/activation/portal/security tests.
- [ ] Run Owner management regression tests.
- [ ] Run migration dependency/reset/regression checks available through the connected environment.
- [ ] Inspect final Git diff and verify no unrelated changes.
