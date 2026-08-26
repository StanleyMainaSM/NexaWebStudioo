# Avelixa Final Business Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and verify the existing Avelixa business workflows across Supabase and the React/Vite portal without replacing working functionality.

**Architecture:** Supabase remains the source of truth for business state, RLS, transactional RPCs, queues, cron scheduling, and automation. The frontend consumes explicit role/capacity-safe interfaces. Automation uses one canonical production worker path with idempotent database operations and dedupe keys.

**Tech Stack:** React, TypeScript, Vite, Supabase/Postgres, Supabase Auth, RLS, Edge Functions, pg_cron, existing notification/email/push queues.

**Spec:** `docs/superpowers/specs/2026-08-26-avelixa-final-business-workflows-design.md`

## Global Constraints

- Preserve existing working functionality.
- Do not expose secrets or service-role credentials.
- Do not mix role capacities for multi-role users.
- Operators must not see client project pricing.
- Do not delete historical financial, audit, commission, payout, or provisioning records.
- Reuse existing workflow tables/functions/queues instead of creating parallel systems.
- Verify every Supabase change with database queries and advisors.
- Keep final changes on `avelixa-final-implementation` until reviewed; do not merge or deploy production automatically.

---

### Task 1: Baseline and automation consolidation

**Files:**
- Inspect: existing Supabase automation migrations and deployed workers.
- Modify: Supabase database functions/cron configuration only where duplicate worker routing remains.
- Create: one final migration documenting and enforcing the canonical production worker route.

**Interfaces:**
- Consumes: existing `automation_events`, cron jobs, notification queues, and production worker functions.
- Produces: one canonical hourly automation execution path with idempotent processing.

- [ ] Step 1: Inspect current cron jobs, automation event counts, and worker routing.
- [ ] Step 2: Identify duplicate active worker routes and verify which one is referenced by the latest cron migration.
- [ ] Step 3: Disable obsolete duplicate schedules/routes without deleting historical data.
- [ ] Step 4: Verify the canonical worker processes pending automation events exactly once.
- [ ] Step 5: Run security and performance advisors.

### Task 2: Maintenance and recurring-service completion

**Files:**
- Inspect: `src/pages/portal/MaintenancePlans.tsx`, maintenance/recurring-service RPCs and migrations.
- Modify: maintenance workflow RPCs only where trial, activation, renewal, billing-period, or cancellation transitions are incomplete.
- Modify: `src/pages/portal/MaintenancePlans.tsx` only where UI state does not reflect backend workflow state.

**Interfaces:**
- Consumes: `maintenance_plans`, `maintenance_subscriptions`, `recurring_services`, `invoices`.
- Produces: consistent subscription lifecycle and invoice renewal periods.

- [ ] Step 1: Verify plan activation creates the expected recurring-service linkage.
- [ ] Step 2: Verify trial expiration transitions to active/billing state according to auto-renew.
- [ ] Step 3: Verify renewal creates exactly one invoice for each due billing period.
- [ ] Step 4: Verify cancelled/paused/past-due subscriptions do not continue billing incorrectly.
- [ ] Step 5: Verify monthly and yearly billing calculations.
- [ ] Step 6: Update frontend only for missing controls/state representation.

### Task 3: Invoice and payment lifecycle

**Files:**
- Inspect: `src/pages/portal/Invoices.tsx`, `src/pages/portal/InvoiceDetails.tsx`.
- Inspect/modify: payment submission and verification RPCs.
- Create/modify: final migration for invoice/payment idempotency and status synchronization.

**Interfaces:**
- Consumes: `invoices`, `payments`, `finance_transactions`.
- Produces: verified payment → invoice status update → notification → eligible commission event.

- [ ] Step 1: Verify client payment submission rejects unauthorized invoices.
- [ ] Step 2: Verify duplicate payment submissions cannot create duplicate financial effects.
- [ ] Step 3: Verify finance/owner verification transitions payment state correctly.
- [ ] Step 4: Verify invoice becomes `paid` only when verified completed payments cover the invoice amount.
- [ ] Step 5: Verify partial payment remains unpaid with correct balance.
- [ ] Step 6: Verify overdue invoices are marked and notified correctly.

### Task 4: Commission and payout workflow

**Files:**
- Inspect: `src/pages/portal/TeamPayouts.tsx`, finance dashboards, commission/payout RPCs.
- Modify: commission creation/idempotency and payout authorization only where required.

**Interfaces:**
- Consumes: verified payments, `commissions`, `payouts`, operator payment records.
- Produces: exactly-once connector commission and role-isolated payout records.

- [ ] Step 1: Verify only commission-eligible transactions create commissions.
- [ ] Step 2: Verify a payment cannot create duplicate commissions on retry.
- [ ] Step 3: Verify connector commission rate is taken from the intended connector profile/business rule.
- [ ] Step 4: Verify operator payouts remain separate from connector commissions.
- [ ] Step 5: Verify only authorized owner/finance roles can mark payouts paid.

### Task 5: Notification and automation coverage

**Files:**
- Inspect: `src/lib/pushNotifications.ts`, `src/lib/pushNotificationService.ts` and notification-related migrations/workers.
- Modify: automation event handlers and notification templates/queries as needed.

**Interfaces:**
- Consumes: business events, notification preferences, email queue, push subscriptions.
- Produces: in-app notification plus optional email/push delivery with dedupe.

- [ ] Step 1: Map required event types: project deadlines, task deadlines, review, invoice due/overdue, maintenance renewal, payment verification, commission, connector approval/provisioning, client/operator project updates.
- [ ] Step 2: Ensure each event creates an in-app notification.
- [ ] Step 3: Ensure preference flags govern email/push delivery.
- [ ] Step 4: Add dedupe keys to recurring notifications so retries are safe.
- [ ] Step 5: Verify queued email/push work is picked up by the canonical workers.

### Task 6: Messaging and role-capacity separation

**Files:**
- Inspect: `src/pages/portal/Messages.tsx` and admin/support messaging RPCs.
- Modify: frontend relationship queries to explicitly select sender vs recipient profile relationships.
- Modify: RPC/policies where role/capacity isolation is incomplete.

**Interfaces:**
- Consumes: `messages`, `conversations`, `admin_messages`, `admin_conversations`, support tables, `user_roles`.
- Produces: role-safe conversations with no ambiguous profile embedding.

- [ ] Step 1: Verify project messages use explicit `profiles!messages_sender_id_fkey` and `profiles!messages_recipient_id_fkey` relationships.
- [ ] Step 2: Verify internal messages are restricted to authorized internal roles.
- [ ] Step 3: Verify external messages always have an explicit recipient.
- [ ] Step 4: Verify multi-role users can communicate in the correct capacity without cross-role data leakage.
- [ ] Step 5: Verify admin/support conversations are separate from project conversations.

### Task 7: Client, operator, admin, owner, and connector portal completion

**Files:**
- Inspect/modify: `src/pages/portal/Documents.tsx`, `Settings.tsx`, `ProjectDetails.tsx`, dashboard files, management pages.

**Interfaces:**
- Consumes: finalized Supabase workflow interfaces.
- Produces: complete role-specific portal behavior.

- [ ] Step 1: Verify client document upload/project selection and storage metadata.
- [ ] Step 2: Verify client settings/profile update and activity.
- [ ] Step 3: Verify operator project workspace updates progress, notes, tasks, deadlines, priorities, review submission, and admin communication without client pricing.
- [ ] Step 4: Verify admin client/project/operator/connector management.
- [ ] Step 5: Verify owner role assignment remains authoritative.
- [ ] Step 6: Verify connector application/provisioning and lead submission UI against final backend state.

### Task 8: Security hardening and final verification

**Files:**
- Create: final security migration if required.
- Modify: only affected frontend/backend files.

- [ ] Step 1: Resolve or explicitly constrain all relevant security-advisor findings, especially RLS-enabled tables without policies and exposed SECURITY DEFINER functions.
- [ ] Step 2: Verify owner-sensitive finance operations cannot be invoked by unauthorized roles.
- [ ] Step 3: Verify all exposed public tables remain RLS protected.
- [ ] Step 4: Verify no service-role secret appears in frontend source.
- [ ] Step 5: Run database verification queries for every core workflow.
- [ ] Step 6: Run frontend typecheck/build and fix failures.
- [ ] Step 7: Run final Supabase security/performance advisors.
- [ ] Step 8: Commit all final changes to `avelixa-final-implementation` and report exact verification results.
