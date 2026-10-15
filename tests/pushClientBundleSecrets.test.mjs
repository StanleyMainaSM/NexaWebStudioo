import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const assetsDirectory = path.join(process.cwd(), 'dist', 'assets');
assert.ok(fs.existsSync(assetsDirectory), 'production client assets must exist before the secret scan');

const forbidden = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /avelixa_push_webhook_secret/i,
  /x-avelixa-push-secret/i,
  /VAPID_PRIVATE_KEY/i,
];
const assets = fs.readdirSync(assetsDirectory)
  .filter((name) => /\.(?:js|mjs|css)$/i.test(name));
assert.ok(assets.length > 0, 'the build must emit client assets');

for (const asset of assets) {
  const source = fs.readFileSync(path.join(assetsDirectory, asset), 'utf8');
  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern, `client asset ${asset} contains a privileged push credential marker`);
  }
}

console.log(`Client bundle privileged push-secret scan: PASS (${assets.length} assets)`);
