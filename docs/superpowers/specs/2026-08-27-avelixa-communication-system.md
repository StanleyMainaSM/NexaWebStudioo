# Avelixa Communication System

## Goal
Extend the existing Avelixa messaging experience with optional direct conversations and authenticated voice/video calls without removing the existing automatic Admin conversation.

## Requirements
- Every non-management user keeps an automatic Admin conversation; they do not need to know an Admin ID.
- Users can optionally start another conversation by entering an authorized Avelixa identifier. Connector AVL IDs are supported first; direct UUID lookup is restricted to exact authenticated user IDs.
- Direct conversations contain only their authorized participants.
- Existing admin_conversations/admin_messages behavior remains intact.
- Messages remain realtime and authenticated.
- Voice and video calls are launched from a conversation.
- Calls use WebRTC for media and Supabase Realtime private Broadcast channels for signaling.
- Call history is persisted in Supabase.
- Caller and recipient must be participants in the conversation.
- Incoming calls show accept/decline controls.
- Voice calls support mute and end-call.
- Video calls support mute, camera on/off and end-call.
- Mobile and desktop browser layouts are supported.
- Role separation is preserved; a multi-role account does not merge role-specific dashboard data.
- No service-role key is exposed to the browser.
- Existing routes, portal access, connector terms gate, owner/admin workflows and production routing remain unchanged.

## Architecture
- Add direct_conversations, direct_conversation_participants, direct_messages and call_sessions tables with RLS.
- Add secure RPCs for finding an authorized recipient and creating/getting a direct conversation.
- Keep existing Admin conversation implementation as the default conversation.
- Add a communication hub page that renders the existing Admin conversation and optional direct conversations.
- Add reusable CallOverlay/WebRTC signaling component.
- Use private Realtime topics scoped to conversation/call IDs and participant authorization.
- Use configurable STUN/TURN ICE servers; Google STUN is a fallback and TURN can be supplied through Vite environment variables.
