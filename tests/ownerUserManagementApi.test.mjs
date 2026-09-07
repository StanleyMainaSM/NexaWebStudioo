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

test('Vercel API entrypoint loads the generated Express bundle and serves JSON', async (t) => {
  process.env.VERCEL = '1';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test-signature';

  const { default: app } = await import('../api/index.ts');
  assert.equal(typeof app, 'function');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.match(health.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const unauthorized = await fetch(`${baseUrl}/api/owner/users`);
  assert.equal(unauthorized.status, 401);
  assert.match(unauthorized.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await unauthorized.json(), {
    error: 'Missing authentication token.',
  });
});

test('Vercel API entrypoint uses the generated JavaScript server bundle so Vercel does not emit a TypeScript-extension build error', () => {
  const entrypoint = read('api/index.ts');
  const config = read('vercel.json');
  const serverSource = read('server.ts');
  const generatedServer = read('server.js');
  const packageJson = JSON.parse(read('package.json'));

  assert.match(entrypoint, /import app from ['"]\.\.\/server\.js['"]/);
  assert.match(entrypoint, /export default app/);
  assert.match(config, /"source": "\/api\/:path\*"/);
  assert.match(config, /"destination": "\/api\/index"/);
  assert.match(config, /\(\?!api\//);
  assert.match(serverSource, /export default app/);
  assert.match(serverSource, /process\.env\.VERCEL !== ['"]1['"]/);
  assert.match(packageJson.scripts.build, /--outfile=server\.js/);
  assert.match(generatedServer, /server\.ts/);
  assert.match(generatedServer, /app\.get\("\/api\/health"/);
  assert.match(generatedServer, /app\.get\("\/api\/owner\/users"/);
  assert.ok(fs.statSync(path.join(root, 'server.js')).size > 10000);
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

test('Owner role-management routes and UI use the structured API response contract', () => {
  const server = read('server.ts');
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');

  assert.match(server, /app\.post\(\s*["']\/api\/owner\/users\/:id\/roles["']/);
  assert.match(server, /app\.delete\(\s*["']\/api\/owner\/users\/:id\/roles\/:role["']/);
  assert.match(server, /status\(401\)\.json/);
  assert.match(server, /status\(403\)\.json/);
  assert.match(server, /isOwner\(ownerUser\.id\)/);
  assert.match(ui, /const result = await readOwnerApiResponse\(response\);/);
  assert.doesNotMatch(ui, /const result = await response\.json\(\);[\s\S]{0,300}Role update failed/);
});

test('Permanent-removal route keeps server-side authorization and structured JSON error contracts', () => {
  const server = read('server.ts');
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');

  assert.match(server, /app\.delete\(\s*["']\/api\/owner\/users\/:id["']/);
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
