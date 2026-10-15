import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync(
  new URL('../supabase/functions/avelixa-push-worker/index.ts', import.meta.url),
  'utf8',
);

// Production is always explicitly allowed; the repository's actual Vite dev port
// and its IPv4 loopback equivalent are allowed without opening CORS to all origins.
assert.match(worker, /productionOrigin\s*=\s*"https:\/\/www\.avelixa\.co\.ke"/);
assert.match(worker, /"http:\/\/localhost:3000"/);
assert.match(worker, /"http:\/\/127\.0\.0\.1:3000"/);
assert.match(worker, /AVELIXA_PUSH_ALLOWED_ORIGINS/);
assert.match(worker, /function isValidAllowedOrigin\(value: string\)/);
assert.match(worker, /parsed\.origin !== value/);
assert.match(worker, /parsed\.protocol === "https:"/);
assert.match(worker, /parsed\.protocol === "http:"[\s\S]*\["localhost", "127\.0\.0\.1", "\[::1\]"\]/);
assert.match(worker, /function corsHeadersFor\(req: Request\)/);
assert.match(worker, /if \(origin && allowedOrigins\.has\(origin\)\)[\s\S]*Access-Control-Allow-Origin/);
assert.doesNotMatch(worker, /Access-Control-Allow-Origin["']?\s*:\s*["']\*["']/);
assert.doesNotMatch(worker, /Access-Control-Allow-Origin["']?\s*:\s*origin\s*,/);
assert.match(worker, /if \(origin && !allowedOrigins\.has\(origin\)\)[\s\S]*}, 403\)/);
assert.match(worker, /req\.method === "OPTIONS"[\s\S]*status: 204[\s\S]*corsHeadersFor\(req\)/);
assert.match(worker, /headers: \{ "Content-Type": "application\/json", \.\.\.corsHeadersFor\(req\) \}/);

// Every JSON response is request-scoped so an approved origin gets matching CORS
// headers and an unapproved Origin cannot inherit a production-only header.
assert.doesNotMatch(worker, /const corsHeaders\s*=\s*\{/);
assert.doesNotMatch(worker, /headers:\s*corsHeaders\s*\}/);
assert.match(worker, /if \(!incomingSecret \|\| incomingSecret !== secret\) return json\(req, \{ error: "Unauthorized" \}, 401\)/);

console.log('Push worker CORS allowlist contract: PASS');
