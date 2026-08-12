# Avelixa Repository Instructions

## Project Overview

Avelixa is a multi-role business management and client portal web application.

The application uses:
- React
- TypeScript
- Supabase
- Supabase Authentication
- Supabase PostgreSQL
- Supabase Row Level Security (RLS)
- Supabase Storage

The application has five primary roles:

- Owner
- Admin
- Operator/Developer
- Connector
- Client

The application is already substantially implemented. Work on the existing codebase rather than rebuilding it.

## Core Development Rules

- Inspect the existing implementation before making changes.
- Reuse existing components, routes, database tables, migrations, utilities, and styling whenever possible.
- Make the smallest safe change necessary to complete the requested task.
- Do not rewrite working functionality unnecessarily.
- Do not create duplicate components, routes, tables, migrations, or functions.
- Do not change unrelated areas of the application.
- Do not remove existing functionality unless explicitly required.
- Preserve the existing Avelixa visual style and navigation structure.
- Keep TypeScript strict and type-safe.
- After code changes, run `npm run typecheck`.
- Fix all TypeScript errors before considering a task complete.
- Do not claim something works merely because the TypeScript check passes.
- Distinguish between code verification and real Supabase/runtime verification.

## Role Architecture

The Owner has the highest level of control.

Admins manage authorized business operations according to the existing role model.

Operators/Developers work on projects assigned to them.

Connectors are associated with projects through the existing connector relationship.

Clients should only access their own client-facing information.

Do not change role permissions unless the task explicitly requires it.

## Client Security

Client data must always be scoped to the authenticated Client.

A Client must never be able to access another Client's:

- projects
- project messages
- invoices
- documents/files
- profile information
- private activity
- other private business information

Use the authenticated Supabase identity (`auth.uid()`) and the existing RLS architecture.

Never trust a user ID supplied by the URL or arbitrary frontend input for authorization.

Do not weaken RLS merely to make a UI feature work.

If a feature requires a database permission change, inspect the existing migrations and policies first and make the smallest safe change.

## Supabase Security

Never expose a Supabase service-role key or other server secret in frontend code.

The frontend must use the existing public/anonymous Supabase client configuration.

Do not bypass RLS from the frontend.

Do not introduce arbitrary-user RPC functions that expose private information.

Role lookups must remain consistent with the existing secure helper/RPC architecture.

Security-definer functions must use an explicit safe search path and must not unnecessarily expose privileged functionality.

## Database and Migration Rules

Before changing the database:

1. Inspect the existing schema.
2. Inspect relevant migrations.
3. Inspect existing RLS policies.
4. Inspect existing indexes.
5. Check whether the required table/column/function already exists.
6. Avoid duplicate migrations.
7. Do not perform destructive data operations unless explicitly requested.
8. Do not modify the live Supabase database automatically.
9. Prefer the smallest migration necessary.

Existing project relationship fields include the relationships used by the current authorization model, including:

- `projects.client_id`
- `projects.developer_id`
- `projects.connector_id`

Do not rename or replace these relationships without a clear architectural reason.

## Supabase Storage

For file/document functionality:

- Inspect the existing bucket configuration before creating anything new.
- Inspect existing Storage policies.
- Use the authenticated user's identity.
- Keep project/document access scoped to the appropriate Client/project relationship.
- Do not fake uploads in the UI.
- Verify actual upload, storage, metadata creation, and download behavior where possible.
- Do not expose files belonging to another Client.

## Client Portal

The Client portal currently contains or is intended to contain:

- Dashboard
- Projects
- Project Details
- Messages
- Invoices
- Invoice Details
- Documents
- Activity
- Settings/Profile

Keep these areas consistent with one another.

Client dashboard information should come from real authenticated data rather than hard-coded values.

Client project lists must remain scoped to the authenticated Client.

Client invoice lists must remain scoped to the authenticated Client.

Client documents must remain scoped to projects belonging to the authenticated Client.

Client profile editing must only modify the authenticated user's profile.

## UI/UX Rules

Maintain the existing Avelixa visual language.

Use consistent:

- spacing
- typography
- cards
- buttons
- status indicators
- loading states
- empty states
- error states
- success feedback
- responsive behavior

Every data-driven page should handle:

- loading
- successful data
- empty results
- errors

Do not introduce unnecessary redesigns.

## Routing and Authorization

Protected routes must remain protected.

Client routes must not expose Owner/Admin management functionality.

Owner/Admin management pages must remain restricted to their appropriate roles.

Do not rely solely on hiding navigation links for security. Backend RLS and authorization must enforce access.

## Testing

For every meaningful change:

1. Inspect the relevant existing code.
2. Make the smallest necessary change.
3. Run `npm run typecheck`.
4. Fix all TypeScript errors.
5. Check for unused imports and obvious runtime problems.
6. If Supabase functionality is involved, distinguish between local/type verification and actual live Supabase verification.

Never state that live database behavior has been verified unless it was actually tested against the live environment.

## Change Discipline

When asked to fix a specific bug:

- Fix that bug first.
- Do not use the task as an excuse to rebuild unrelated features.
- Do not modify unrelated roles.
- Do not modify unrelated pages.
- Do not create unnecessary dependencies.
- Do not change the database unless necessary.
- Explain what files were changed and why.

The goal is to incrementally turn the existing Avelixa application into a reliable production-ready system without breaking previously completed work.