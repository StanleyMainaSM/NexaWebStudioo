export type ConnectorLeadLifecycle = {
  leadStatus: string | null;
  projectStatus: string | null;
  commissionStatus: string | null;
  hasProject: boolean;
  hasCommission: boolean;
};

export type ConnectorLeadStage =
  | 'submitted'
  | 'under_review'
  | 'contacted'
  | 'qualified'
  | 'rejected'
  | 'converted'
  | 'project_active'
  | 'completed'
  | 'commission_earned';

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase().replace(/\s+/g, '_');

export function getConnectorLeadStage(state: ConnectorLeadLifecycle): ConnectorLeadStage {
  const lead = normalize(state.leadStatus);
  const project = normalize(state.projectStatus);
  const commission = normalize(state.commissionStatus);

  if (state.hasCommission && !['cancelled', 'canceled', 'rejected', 'void'].includes(commission)) return 'commission_earned';
  if (['completed', 'complete', 'delivered'].includes(project)) return 'completed';
  if (state.hasProject && !['cancelled', 'canceled', 'rejected'].includes(project)) return 'project_active';
  if (['won', 'converted', 'accepted'].includes(lead)) return 'converted';
  if (['qualified', 'approved'].includes(lead)) return 'qualified';
  if (['contacted', 'in_contact'].includes(lead)) return 'contacted';
  if (['rejected', 'lost', 'declined'].includes(lead)) return 'rejected';
  if (['review', 'under_review', 'in_review'].includes(lead)) return 'under_review';
  return 'submitted';
}

export const connectorLeadStageLabel: Record<ConnectorLeadStage, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  contacted: 'Contacted',
  qualified: 'Qualified',
  rejected: 'Rejected',
  converted: 'Converted',
  project_active: 'Project Active',
  completed: 'Completed',
  commission_earned: 'Commission Earned',
};
