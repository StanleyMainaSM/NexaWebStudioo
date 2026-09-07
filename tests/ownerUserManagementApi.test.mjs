import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

async function startExpressApp() {
  process.env.VERCEL = '1';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test-signature';

  const { default: app } = await import('../server.ts');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

test('Vercel API entrypoint exposes the existing Express app and SPA rewrite excludes /api', () => {
  const entrypoint = read('api/index.ts');
  const config = read('vercel.json');
  const server = read('server.ts');

  assert.match(entrypoint, /import app from ['"]\.\.\/server['"]/);
  assert.match(entrypoint, /export default app/);
  assert.match(config, /\(\?!api\//);
  assert.match(server, /export default app/);
  assert.match(server, /process\.env\.VERCEL !== ['"]1['"]/);
});

test('Express API responds with JSON and does not fall through to the SPA', async (t) => {
  const { server, baseUrl } = await startExpressApp();
  t.after(() => server.close());

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.match(health.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const unauthorized = await fetch(`${baseUrl}/api/owner/users`);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get('content-type') || '', /application\/json/);
  const body = await unauthorized.json();
  assert.equal(body.error, 'Missing authentication token.');
});

test('Permanent-removal route keeps server-side authorization and structured JSON error contracts', () => {
  const server = read('server.ts');
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');

  assert.match(server, /app\.delete\(["']\/api\/owner\/users\/:id["']/);
  assert.match(server, /isOwner\(ownerUser\.id\)/);
  assert.match(server, /status\(401\)\.json/);
  assert.match(server, /status\(403\)\.json/);
  assert.match(server, /You cannot permanently remove your own Owner account/);
  assert.match(server, /Another Owner account cannot be permanently removed/);
  assert.match(server, /auth\.admin\.deleteUser\(targetUserId\)/);
  assert.match(server, /owner_user_permanently_deleted/);
  assert.match(server, /Permanent account removal could not be completed/);
  assert.match(ui, /readOwnerApiResponse/);
  assert.match(ui, /unexpected response/);
  assert.match(ui, /invalid JSON response/);
});

test('Permanent-removal UI converts HTML/plain-text responses into a controlled error', async () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /const body = await response\.text\(\)/);
  assert.match(source, /!contentType\.toLowerCase\(\)\.includes\('application\/json'\)/);
  assert.match(source, /body\.replace\(\/\\s\+\/g, ' '\)/);
  assert.doesNotMatch(source, /handleDeleteUser[\s\S]{0,1200}response\.json\(\)/);
});
