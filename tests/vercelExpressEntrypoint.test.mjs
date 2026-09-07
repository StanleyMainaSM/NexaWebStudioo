import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';

process.env.VERCEL = '1';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test-signature';

test('Vercel API entrypoint resolves the production server bundle and serves JSON', async (t) => {
  const entrypoint = fs.readFileSync('api/index.ts', 'utf8');
  assert.match(entrypoint, /from ['"]\.\.\/dist\/server\.js['"]/);

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
  assert.match(health.headers.get('content-type') || '', /application\\/json/);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const unauthorized = await fetch(`${baseUrl}/api/owner/users`);
  assert.equal(unauthorized.status, 401);
  assert.match(
    unauthorized.headers.get('content-type') || '',
    /application\\/json/
  );
  assert.deepEqual(await unauthorized.json(), {
    error: 'Missing authentication token.',
  });
});
