import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/lib/connectorNotifications.ts'),
  'utf8',
);

const cases = [
  ['connector_lead_action_required', 'Lead requires attention', '/portal/connector/leads', 'lead'],
  ['project_submitted_for_review', 'Project submitted for review', '/portal/projects', 'project'],
  ['message', 'New message', '/portal/messages', 'communication'],
  ['commission_status_changed', 'Commission status changed', '/portal/connector', 'commission'],
];

test('Connector notification presentation preserves supported notification routing', () => {
  for (const [type, label, link, category] of cases) {
    const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedLink = link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedCategory = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const casePattern = new RegExp(
      `notification_type\\s*===\\s*["']${escapedType}["'][\\s\\S]*?label:\\s*["']${escapedLabel}["'][\\s\\S]*?link:\\s*["']${escapedLink}["'][\\s\\S]*?category:\\s*["']${escapedCategory}["']`,
    );
    assert.match(source, casePattern, `Notification mapping must remain intact for ${type}`);
  }
});

test('Unknown Connector notifications retain the safe system fallback', () => {
  assert.match(source, /title\s*\?\?\s*["']Avelixa announcement["']/);
  assert.match(source, /link:\s*["']\/portal\/activity["']/);
  assert.match(source, /category:\s*["']system["']/);
});

test('Connector activation notification does not expose activation URLs or credentials', () => {
  assert.doesNotMatch(source, /activation_url|action_link|temporaryPassword/i);
});

console.log('connector notification tests: PASS');
