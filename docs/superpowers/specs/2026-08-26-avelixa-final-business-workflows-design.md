# Avelixa Final Business Workflows Design

## Goal
Finish the existing Avelixa platform so its client, operator, admin/owner, connector, recurring-service, billing, notification, messaging, and security workflows operate as one coherent production-ready system without replacing working functionality.

## Current State
The current `avelixa-current-work` branch already contains the latest frontend implementation and the Supabase project already contains migrations through the maintenance, payment, notification, and security work completed on 2026-08-26. The database is healthy and includes project/task/file, invoice/payment, maintenance/recurring-service, commission/payout, notification/email/push, connector provisioning, messaging, review, finance, and catalogue structures. The remaining work is primarily consolidation, verification, missing workflow wiring, security hardening, and synchronization of the latest implementation into a clean source-controlled state.

## Architecture
Supabase remains the source of truth for business state, RLS, transactional RPCs, notification queues, automation events, and scheduled processing. The React/Vite portal remains a role-separated client for those workflows; privileged operations continue through server/Edge Function/RPC boundaries and never expose service-role credentials.

Automation uses the existing event/queue/cron architecture and a single canonical production worker path. Existing duplicate worker generations must not be allowed to create duplicate side effects.

## Business Flows
1. **Project lifecycle:** pending → in_progress → review → completed → maintenance/cancelled/on_hold. Operator progress and task completion feed operational status; admin review gates completion; clients never receive internal financial/operator fields.
2. **Maintenance/recurring service:** a completed project can be associated with a maintenance plan or recurring service. Monthly/yearly billing, trial periods, renewal dates, auto-renew, cancellation, past-due handling, and renewal reminders must use the existing maintenance/recurring-service/invoice structures.
3. **Billing/payment:** invoices are created for one-time and recurring charges; client payment submission creates a pending payment; authorized finance/owner verification changes payment state; verified payments synchronize invoice state and create eligible connector commissions exactly once.
4. **Payouts/commissions:** connector commissions and operator payouts remain separate financial capacities. Owner/authorized finance administration controls verification and payout; connector/operator portals only see their own applicable records.
5. **Notifications:** business events create in-app notifications and, where preferences allow, email/push queue entries. Dedupe keys prevent repeated notifications from retries.
6. **Connector lifecycle:** pending application → admin approval → provisioning queue → Auth/profile/connector profile creation → activation URL/email → active connector. Provisioning is idempotent and auditable.
7. **Messaging:** project conversations are role-aware and use explicit sender/recipient relationships; admin/support messaging is separate from project conversations. Multi-role users retain separate capacity-specific views and permissions.
8. **Documents:** project file metadata and storage paths remain project-scoped; clients/operators can access only permitted project files and internal files remain hidden from clients.
9. **Security:** all exposed public-schema tables remain RLS protected. Privileged SECURITY DEFINER functions are limited to the roles/workflows that genuinely require them; no frontend can obtain service-role credentials.

## Completion Criteria
- No duplicate automation side effects from multiple workers or cron routes.
- Maintenance subscriptions and recurring services create the correct invoice periods and renewal state.
- Verified payments produce correct invoice status and one commission record where eligible.
- Connector approval provisions exactly one user/profile/connector profile and sends an activation notification without plaintext passwords.
- Client/operator/admin/owner/connector data remains isolated by role and capacity.
- Messaging relationship ambiguity is resolved in frontend queries and server/RPC interfaces.
- Security advisors have no high-risk findings and intentional warnings are documented or removed.
- Frontend build passes and the portal routes compile against the final database types.
- Database verification queries demonstrate the core workflows and idempotency.
- The final implementation is committed on `avelixa-final-implementation` and ready for review before any production merge/deploy.

## Constraints
- Preserve existing working functionality.
- Do not expose secrets or service-role credentials.
- Do not mix role capacities for users holding multiple roles.
- Do not expose client project price to operators.
- Do not delete historical commission, payout, audit, or provisioning records merely to simplify workflows.
- Prefer existing tables/functions/queues over parallel duplicate systems.
