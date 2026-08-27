import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from '@supabase/supabase-js';
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:{'content-type':'application/json'}});
  const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!, service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=req.headers.get('Authorization')||''; const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:ae}=await client.auth.getUser(); if(ae||!user)return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:{'content-type':'application/json'}});
  const body=await req.json().catch(()=>({})); const email=String(body.email||'').trim().toLowerCase(); const fullName=String(body.full_name||'').trim(); const requestedRedirect=String(body.redirect_to||'').trim();
  if(!email||!fullName||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return new Response(JSON.stringify({error:'A valid name and email address are required.'}),{status:400,headers:{'content-type':'application/json'}});
  const admin=createClient(url,service); const {data:existing}=await admin.from('profiles').select('id').eq('email',email).maybeSingle();
  if(existing)return new Response(JSON.stringify({error:'This email is already registered on Avelixa.'}),{status:409,headers:{'content-type':'application/json'}});
  const {data:pending}=await admin.from('chat_contact_invitations').select('id').eq('inviter_id',user.id).eq('email',email).eq('status','sent').maybeSingle();
  if(!pending){const {error:ie}=await admin.from('chat_contact_invitations').insert({inviter_id:user.id,email,contact_name:fullName,status:'sent'});if(ie)return new Response(JSON.stringify({error:ie.message}),{status:400,headers:{'content-type':'application/json'}});}
  const fallback=Deno.env.get('APP_URL')||'https://sabre.co.ke'; const base=requestedRedirect||fallback; const redirectTo=`${base.replace(/\/$/,'')}/set-password`;
  const {error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo,data:{invited_by:user.id,invited_contact_name:fullName,invitation_type:'chat'}});
  if(inviteError)return new Response(JSON.stringify({error:inviteError.message}),{status:400,headers:{'content-type':'application/json'}});
  return new Response(JSON.stringify({ok:true,message:`Invitation sent to ${email}.`}),{status:200,headers:{'content-type':'application/json'}});
});