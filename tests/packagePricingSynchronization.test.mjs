import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pricing = readFileSync(new URL('../src/pages/Pricing.tsx', import.meta.url), 'utf8');
const packagesAdmin = readFileSync(new URL('../src/pages/portal/WebsitePackages.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

assert.match(pricing, /from ['"]\.\.\/lib\/supabase['"]/);
assert.match(pricing, /supabase\s*\.\s*from\(['"]packages['"]\)/);
assert.match(pricing, /select\(/);
assert.match(pricing, /is_active/);
assert.match(pricing, /min_price/);
assert.match(pricing, /max_price/);
assert.match(pricing, /features/);
assert.doesNotMatch(pricing, /const\s+tiers\s*=/);
assert.doesNotMatch(pricing, /KSh\s*15,000[–-]20,000/);
assert.doesNotMatch(pricing, /KSh\s*30,000[–-]35,000/);
assert.doesNotMatch(pricing, /Professional custom website/);

assert.match(packagesAdmin, /supabase\s*\.\s*from\(['"]packages['"]\)/);
assert.match(packagesAdmin, /\.insert\(/);
assert.match(packagesAdmin, /\.update\(/);
assert.match(packagesAdmin, /\.delete\(/);

assert.match(
  app,
  /path="website-packages"\s+element={<ProtectedRoute requiredRoles=\{\['owner','admin'\]\}><WebsitePackages\s*\/>/,
);

console.log('packagePricingSynchronization.test.mjs: PASS');
