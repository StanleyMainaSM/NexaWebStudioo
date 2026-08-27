import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const fullName = String(body.full_name || '').trim();
  if (!email || !fullName || !/^\S+@\S+\.\S+$/.test(email)) return new Response(JSON.stringify({ error: 'A valid name and email address are required.' }), { status: 400, headers: { 'content-type': 'application/json' } });
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existing) return new Response(JSON.stringify({ error: 'This email is already registered on Avelixa.' }), { status: 409, headers: { 'content-type': 'application/json' } });
  const { error: invitationError } = await admin.from('chat_contact_invitations').upsert({ inviter_id: user.id, email, contact_name: fullName, status: 'sent' }, { onConflict: 'inviter_id,email' });
  if (invitationError) return new Response(JSON.stringify({ error: invitationError.message }), { status: 400, headers: { 'content-type': 'application/json' } });
  const origin = req.headers.get('origin') || supabaseUrl;
  const redirectTo = `${origin.replace(/\/$/, '')}/set-password`;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { invited_by: user.id, invited_contact_name: fullName, invitation_type: 'chat' } });
  if (inviteError) return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: { 'content-type': 'application/json' } });
  return new Response(JSON.stringify({ ok: true, message: `Invitation sent to ${email}.` }), { status: 200, headers: { 'content-type': 'application/json' } });
});
