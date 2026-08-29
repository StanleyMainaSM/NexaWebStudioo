import assert from 'node:assert/strict';
import { getConnectorNotificationPresentation } from '../src/lib/connectorNotifications.ts';

assert.deepEqual(getConnectorNotificationPresentation({ notification_type: 'connector_lead_action_required', link: null }), { label: 'Lead requires attention', link: '/portal/connector/leads', category: 'lead' });
assert.deepEqual(getConnectorNotificationPresentation({ notification_type: 'message', link: null }), { label: 'New message', link: '/portal/messages', category: 'communication' });
assert.deepEqual(getConnectorNotificationPresentation({ notification_type: 'commission_status_changed', link: '/portal/connector' }), { label: 'Commission status changed', link: '/portal/connector', category: 'commission' });
assert.deepEqual(getConnectorNotificationPresentation({ notification_type: 'unknown_event', title: 'Avelixa announcement', link: null }), { label: 'Avelixa announcement', link: '/portal/activity', category: 'system' });
console.log('connector notification tests: PASS');
