import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');

test('Vercel Owner API entrypoint loads the generated CommonJS server bundle', async (t) => {
  process.env.VERCEL = '1';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  const entrypoint = read('api/index.ts');
  const packageJson = JSON.parse(read('package.json'));
  const generatedServer = read('api/server.cjs');

  assert.match(entrypoint, /from ['"]\.\/server\.cjs['"]/);
  assert.match(packageJson.scripts.build, /--format=cjs/);
  assert.match(packageJson.scripts.build, /--outfile=api\/server\.cjs/);
  assert.match(generatedServer, /api\/health/);
  assert.doesNotMatch(generatedServer, /from ["']vite["']/);

  const { default: app } = await import('../api/index.ts');
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
});

test('Owner User Management API surface and security contract remain present', () => {
  const server = read('server.ts');
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');

  for (const route of [
    '/api/owner/users',
    '/api/owner/users/:id/roles',
    '/api/owner/users/:id/roles/:role',
    '/api/owner/users/:id',
  ]) {
    assert.match(server, new RegExp(route.replaceAll('/', '\\/')));
  }

  assert.match(server, /status\(401\)\.json/);
  assert.match(server, /status\(403\)\.json/);
  assert.match(server, /isOwner\(ownerUser\.id\)/);
  assert.match(server, /You cannot permanently remove your own Owner account/);
  assert.match(server, /Another Owner account cannot be permanently removed/);
  assert.match(ui, /readOwnerApiResponse/);
  assert.doesNotMatch(ui, /Portal Access Required/);
});
