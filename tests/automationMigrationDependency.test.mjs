import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baselinePath = path.join(root, 'supabase', 'migrations', '20260820169999_create_automation_events_baseline.sql');
const dependentPath = path.join(root, 'supabase', 'migrations', '20260820170000_phase_12_automation.sql');

assert.ok(fs.existsSync(baselinePath), 'automation events baseline must exist');
assert.ok(fs.existsSync(dependentPath), 'phase 12 automation migration must exist');

const baseline = fs.readFileSync(baselinePath, 'utf8');
const dependent = fs.readFileSync(dependentPath, 'utf8');

assert.match(baseline, /CREATE TABLE IF NOT EXISTS public\.automation_events/i);
assert.match(baseline, /CREATE OR REPLACE FUNCTION private\.log_avelixa_automation_event/i);
assert.match(baseline, /INSERT INTO public\.automation_events/i);
assert.match(dependent, /automation_events|log_avelixa_automation_event/i);
assert.ok(
  '20260820169999_create_automation_events_baseline.sql' < '20260820170000_phase_12_automation.sql',
  'automation events baseline must precede phase 12 automation',
);

console.log('Automation migration dependency guard: PASS');
