export type ConnectorNotification = {
  notification_type: string | null;
  title?: string | null;
  link?: string | null;
};

export type ConnectorNotificationPresentation = {
  label: string;
  link: string;
  category: 'lead' | 'project' | 'commission' | 'payout' | 'recruitment' | 'communication' | 'system';
};

const TYPE_MAP: Record<string, Omit<ConnectorNotificationPresentation, 'link'>> = {
  connector_lead_submitted: { label: 'Lead submitted', category: 'lead' },
  connector_lead_status_changed: { label: 'Lead status changed', category: 'lead' },
  connector_lead_action_required: { label: 'Lead requires attention', category: 'lead' },
  project_created: { label: 'Project created', category: 'project' },
  project_submitted_for_review: { label: 'Project submitted for review', category: 'project' },
  project_status_changed: { label: 'Project status changed', category: 'project' },
  project_progress_updated: { label: 'Project progress updated', category: 'project' },
  project_completed: { label: 'Project completed', category: 'project' },
  commission_created: { label: 'Commission earned', category: 'commission' },
  commission_status_changed: { label: 'Commission status changed', category: 'commission' },
  payout_created: { label: 'Commission payment recorded', category: 'payout' },
  payout_status_changed: { label: 'Commission payment status changed', category: 'payout' },
  connector_referral_completed: { label: 'Successful referral', category: 'recruitment' },
  connector_became_active: { label: 'Referred Connector became active', category: 'recruitment' },
  message: { label: 'New message', category: 'communication' },
  call: { label: 'Incoming call', category: 'communication' },
};

const DEFAULT_LINKS: Record<ConnectorNotificationPresentation['category'], string> = {
  lead: '/portal/connector/leads',
  project: '/portal/projects',
  commission: '/portal/connector',
  payout: '/portal/connector',
  recruitment: '/portal/connector',
  communication: '/portal/messages',
  system: '/portal/activity',
};

export function getConnectorNotificationPresentation(notification: ConnectorNotification): ConnectorNotificationPresentation {
  const type = (notification.notification_type || '').trim().toLowerCase();
  const mapped = TYPE_MAP[type] || { label: notification.title?.trim() || 'Avelixa update', category: 'system' as const };
  return { ...mapped, link: notification.link?.trim() || DEFAULT_LINKS[mapped.category] };
}
