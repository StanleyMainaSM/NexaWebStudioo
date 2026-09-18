import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const migrationNames=fs.readdirSync(path.join(root,'supabase/migrations')).sort();
const connectorMigrations=migrationNames.filter((name)=>/connector|provisioning|activation/i.test(name));

test('Connector onboarding migrations are ordered and historical reconciliation remains safe',()=>{
 assert.ok(connectorMigrations.includes('20260903093000_connector_historical_reconciliation_status.sql'));
 assert.ok(connectorMigrations.includes('20260903093200_connector_historical_reconciliation_safe_link.sql'));
 assert.ok(migrationNames.indexOf('20260903093000_connector_historical_reconciliation_status.sql')<migrationNames.indexOf('20260903093200_connector_historical_reconciliation_safe_link.sql'));
});

test('historical reconciliation never creates Auth users or assigns Connector roles',()=>{
 const s=read('supabase/migrations/20260903093200_connector_historical_reconciliation_safe_link.sql');
 assert.doesNotMatch(s,/insert\s+into\s+auth\.users/i); assert.doesNotMatch(s,/insert\s+into\s+public\.user_roles/i); assert.doesNotMatch(s,/delete\s+from\s+auth\.users/i);
 assert.match(s,/duplicate_historical_application/i); assert.match(s,/already_correctly_provisioned/i); assert.match(s,/requires_manual_review/i);
});

test('automatic provisioning still refuses incompatible historical accounts',()=>{
 const s=read('supabase/migrations/20260903093500_connector_provisioning_existing_account_guard.sql');
 assert.match(s,/auth\.users/i); assert.match(s,/role in \('owner', 'admin', 'operator', 'client'\)/i); assert.match(s,/automatic Connector assignment is prohibited/i); assert.match(s,/provisioning_manual_review_required/i);
});

test('Connector activation security remains intact for historical workflows',()=>{
 const s=read('supabase/functions/avelixa-connector-activation-resend-prod/index.ts');
 assert.match(s,/generateLink\(\{\s*type: "recovery"/s); assert.doesNotMatch(s,/temporaryPassword|password:/i);
});

test('Connector portal routes still require Connector role and completed Terms',()=>{
 const s=read('src/App.tsx');
 for(const routePath of ['connector','connector/leads','connector/earnings']){
  const m=s.match(new RegExp('<Route\\s+path=["\\']'+routePath+'["\\']\\s+element=\\{<ProtectedRoute\\b([^>]*)>','s'));
  assert.ok(m,routePath); assert.match(m[1],/requiredRoles=\{\s*\[["']connector["']\]\s*\}/); assert.match(m[1],/requiresConnectorTerms/);
 }
});

test('Connector registration confirmation describes the new self-service lifecycle',()=>{
 const s=read('src/pages/ConnectorApplication.tsx');
 assert.match(s,/Connector account created/i); assert.match(s,/No Owner approval/i); assert.match(s,/password you created/i); assert.doesNotMatch(s,/Wait for approval|secure activation link/i);
});
