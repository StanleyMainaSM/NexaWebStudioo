import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = process.cwd();
const supabaseSource = readFileSync(`${root}/src/lib/supabase.ts`, 'utf8');
const viteSource = readFileSync(`${root}/vite.config.ts`, 'utf8');
const financeDashboardSource = readFileSync(`${root}/src/pages/portal/FinanceDashboard.tsx`, 'utf8');

// 1. Verify key sanitization and valid production anon key export
assert.match(supabaseSource, /sb_publishable_HtIrApOSgOzN-Y2QBUR0Gw_t4i0510w/, 'Production anon key must be present in supabase.ts');
assert.match(supabaseSource, /REVOKED_ANON_KEYS/, 'Revoked keys must be trapped and sanitized in supabase.ts');
assert.match(supabaseSource, /export const supabaseUrl/, 'supabaseUrl must be exported');
assert.match(supabaseSource, /export const supabaseAnonKey/, 'supabaseAnonKey must be exported');

// 2. Verify vite.config.ts defines and sanitizes the anon key
assert.match(viteSource, /sb_publishable_HtIrApOSgOzN-Y2QBUR0Gw_t4i0510w/, 'Production anon key must be defined in vite.config.ts');
assert.match(viteSource, /import\.meta\.env\.VITE_SUPABASE_ANON_KEY/, 'define mapping must exist in vite.config.ts');

// 3. Verify FinanceDashboard uses the sanitized supabase configuration
assert.match(financeDashboardSource, /import\s*\{[^}]*supabaseUrl[^}]*supabaseAnonKey[^}]*\}\s*from\s*['"]\.\.\/\.\.\/lib\/supabase['"]/, 'FinanceDashboard must import sanitized keys from lib/supabase');

// 4. Test live network queries to public endpoints
const PRODUCTION_URL = 'https://uhbyruktnhktjeuqsqut.supabase.co';
const PRODUCTION_KEY = 'sb_publishable_HtIrApOSgOzN-Y2QBUR0Gw_t4i0510w';

async function testPublicQueries() {
  const headers = {
    apikey: PRODUCTION_KEY,
    Authorization: `Bearer ${PRODUCTION_KEY}`,
  };

  const reviewsRes = await fetch(
    `${PRODUCTION_URL}/rest/v1/reviews?select=id,comment,status,reviewer_name&status=eq.approved&order=created_at.desc&limit=5`,
    { headers }
  );
  assert.equal(reviewsRes.status, 200, 'Public reviews request must return HTTP 200');
  const reviews = await reviewsRes.json();
  assert.ok(Array.isArray(reviews), 'Reviews must be an array');
  assert.ok(reviews.length > 0, 'Must load approved public reviews');

  const packagesRes = await fetch(
    `${PRODUCTION_URL}/rest/v1/packages?select=id,name,features,min_price,max_price,is_active&is_active=eq.true&order=created_at.asc`,
    { headers }
  );
  assert.equal(packagesRes.status, 200, 'Public website packages request must return HTTP 200');
  const packages = await packagesRes.json();
  assert.ok(Array.isArray(packages), 'Packages must be an array');
  assert.ok(packages.length >= 3, 'Must load all active website packages');

  console.log(`Verified ${reviews.length} reviews and ${packages.length} packages loaded successfully.`);
}

testPublicQueries().then(() => {
  console.log('publicDataLoading.test.mjs: PASS');
}).catch((err) => {
  console.error('publicDataLoading.test.mjs: FAIL', err);
  process.exit(1);
});
