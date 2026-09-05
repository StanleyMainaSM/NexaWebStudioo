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

    const mappingPattern = new RegExp(
      `${escapedType}\\s*:\\s*\\{[\\s\\S]*?label:\\s*["']${escapedLabel}["'][\\s\\S]*?category:\\s*["']${escapedCategory}["']`,
    );
    assert.match(source, mappingPattern, `Centralized notification mapping must remain intact for ${type}`);

    const defaultLinkPattern = new RegExp(
      `${escapedCategory}\\s*:\\s*["']${escapedLink}["']`,
    );
    assert.match(source, defaultLinkPattern, `Default notification link must remain intact for ${type}`);
  }
});

test('Unknown Connector notifications retain the safe system fallback', () => {
  assert.match(source, /notification\.title\?\.trim\(\)\s*\|\|\s*["']Avelixa update["']/);
  assert.match(source, /system:\s*["']\/portal\/activity["']/);
  assert.match(source, /category:\s*["']system["']/);
});

test('Unknown Connector notifications preserve provided non-empty titles', () => {
  assert.match(source, /notification\.title\?\.trim\(\)\s*\|\|/);
});

test('Connector activation notification does not expose activation URLs or credentials', () => {
  assert.doesNotMatch(source, /activation_url|action_link|temporaryPassword/i);
});

console.log('connector notification tests: PASS');
