import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.match(
  appSource,
  /<Route path="connector\/terms" element={<ProtectedRoute requiredRoles=\{\['connector'\]\}><ConnectorTerms \/><\/ProtectedRoute>\} \/>/,
  'Connector Terms must be reachable with connector-role protection only',
);

assert.doesNotMatch(
  appSource,
  /<Route path="connector\/terms" element={<ProtectedRoute[^>]*requiresConnectorTerms/,
  'Connector Terms must not require prior terms acceptance',
);

for (const path of [
  'connector',
  'connector/leads',
  'connector/lead-generation',
  'connector/recruitment',
  'connector/clients',
  'connector/earnings',
]) {
  const routePattern = new RegExp(
    `<Route path="${path}" element={<ProtectedRoute[^>]*requiredRoles=\\{\\['connector'\\]\\}[^>]*requiresConnectorTerms`,
  );
  assert.match(appSource, routePattern, `${path} must remain protected by Connector terms access`);
}

console.log('connector portal routing tests: PASS');
