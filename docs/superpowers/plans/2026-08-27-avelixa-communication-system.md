# Avelixa Communication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional direct messaging plus voice/video calling to the existing Avelixa Admin messaging experience without breaking the automatic Admin conversation.

**Architecture:** Preserve the current `admin_conversations`/`admin_messages` flow as the default support channel. Add a separate participant-based direct conversation model and WebRTC call sessions, using Supabase private Realtime Broadcast for signaling and persisted call history.

**Tech Stack:** React 18, TypeScript, Vite, Supabase JS, Supabase Postgres/RLS/Realtime, WebRTC, Lucide React.

**Spec:** `docs/superpowers/specs/2026-08-27-avelixa-communication-system.md`

## Global Constraints

- Preserve existing Admin messaging and all current portal behavior.
- Do not expose Supabase service-role credentials in browser code.
- Preserve strict Owner/Admin/Client/Operator/Connector role separation.
- Do not deploy to production as part of implementation; verify locally first.

---

### Task 1: Database communication model

**Files:**
- Create: `supabase/migrations/20260827130000_communication_system.sql`

**Deliverable:** Direct conversations, participants, messages and call history with RLS plus secure recipient/conversation RPCs.

- [ ] Create direct conversation tables.
- [ ] Create participant-scoped RLS policies.
- [ ] Create direct message RLS policies.
- [ ] Create call session RLS policies.
- [ ] Add RPC to resolve a Connector AVL ID or exact user UUID to an authorized profile.
- [ ] Add RPC to create/reuse a direct conversation only when both users are authorized Avelixa users.
- [ ] Add Realtime authorization policies for private call/signaling topics scoped to call participants.

### Task 2: WebRTC call engine

**Files:**
- Create: `src/components/portal/CallOverlay.tsx`
- Create: `src/lib/webrtc.ts`

**Deliverable:** Reusable authenticated voice/video calling overlay with WebRTC offer/answer/ICE signaling through private Supabase Broadcast.

- [ ] Define ICE server configuration with STUN fallback and optional VITE TURN variables.
- [ ] Implement caller offer creation.
- [ ] Implement callee answer creation.
- [ ] Implement ICE candidate exchange.
- [ ] Implement accept/decline/end transitions and persisted call status.
- [ ] Implement microphone/camera controls.
- [ ] Clean up tracks, peer connection and Realtime channels on unmount/end.

### Task 3: Communication hub

**Files:**
- Create: `src/pages/portal/CommunicationCenter.tsx`
- Modify: `src/App.tsx`

**Deliverable:** Existing Admin conversation remains automatically available while users can add authorized people by ID and call them.

- [ ] Load the existing Admin conversation for non-management users exactly as before.
- [ ] Load direct conversations for participants.
- [ ] Add `New conversation` search for Connector AVL ID/exact user UUID.
- [ ] Add direct message composer and realtime updates.
- [ ] Add voice/video buttons to the selected conversation.
- [ ] Add incoming-call listener for the authenticated user.
- [ ] Route `/portal/messages` to the new hub.

### Task 4: Local verification

**Files:**
- No production files beyond implementation above.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Verify existing Admin conversation still loads.
- [ ] Verify a direct conversation can be created by ID.
- [ ] Verify messages appear realtime.
- [ ] Verify voice call UI and WebRTC signaling on two authenticated browser sessions.
- [ ] Verify video call UI, mute, camera toggle and end call.
- [ ] Verify unauthorized IDs cannot create conversations.
- [ ] Verify existing Owner/Connector/Client/Operator routes remain accessible only to their permitted roles.

### Task 5: Commit and handoff

- [ ] Commit the implementation to `avelixa-current-work`.
- [ ] Do not deploy until the user reviews local verification results.
