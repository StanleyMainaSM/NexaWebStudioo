import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('Connector registration uses Supabase Auth and required fields',()=>{
 const s=read('src/pages/ConnectorApplication.tsx');
 for(const field of ['Full Name','Email Address','Phone Number','National ID','County','City/Town','Password','Confirm Password']) assert.ok(s.includes(field),field);
 assert.match(s,/registration_type:\s*['"]connector['"]/);
 assert.match(s,/supabase\.auth\.signUp/);
 assert.match(s,/check_email_registered/);
 assert.match(s,/password:form\.password/);
 assert.doesNotMatch(s,/submit_connector_application/);
 assert.doesNotMatch(s,/Approve Connector|Wait for approval|activation invitation/i);
});

test('Connector password is never sent to an application RPC or stored by the UI',()=>{
 const s=read('src/pages/ConnectorApplication.tsx');
 assert.match(s,/supabase\.auth\.signUp/);
 assert.doesNotMatch(s,/rpc\([^)]*password/i);
 assert.doesNotMatch(s,/password_hash/i);
});

test('Existing Terms gate remains enforced',()=>{
 const s=read('src/components/portal/ProtectedRoute.tsx');
 assert.match(s,/terms_accepted_at/);
 assert.match(s,/\/portal\/connector\/terms/);
});

test('Self-service migration provisions Connector records and preserves Auth-only password storage',()=>{
 const s=read('supabase/migrations/20260918190000_self_service_connector_registration.sql');
 assert.match(s,/check_email_registered/);
 assert.match(s,/validate_connector_referral/);
 assert.match(s,/registration_type/);
 assert.match(s,/insert into public\.user_roles[\s\S]*connector/i);
 assert.match(s,/insert into public\.connector_profiles/i);
 assert.match(s,/insert into public\.connector_applications/i);
 assert.match(s,/national_id_secure/);
 assert.match(s,/raw_user_meta_data/);
});

test('Owner Connector view exposes registration fields without credentials',()=>{
 const s=read('src/pages/portal/ConnectorApplications.tsx');
 for(const field of ['national_id_secure','referring_connector_id','email','phone','county','town']) assert.match(s,new RegExp(field));
 assert.doesNotMatch(s,/password|password_hash|recovery_token|activation_url/i);
});
