export type ClientLifecycleStep = {
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
};

export type ClientLifecycleState = {
  key: string;
  label: string;
  steps: ClientLifecycleStep[];
};

export type ClientProjectPresentation = {
  label: string;
  nextAction: string;
};

const LEAD_STAGES = [
  { key: 'submitted', label: 'Request submitted' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'qualified', label: 'Qualified' },
  { key: 'proposal', label: 'Proposal' },
  { key: 'converted', label: 'Converted' },
];

export function getClientLifecycleState(
  leadStatus: string | null | undefined,
  projectStatus: string | null | undefined,
): ClientLifecycleState {
  const normalizedProject = String(projectStatus || '').toLowerCase();
  const normalizedLead = String(leadStatus || '').toLowerCase();

  if (normalizedProject) {
    const projectKey = ['cancelled', 'cancelled_by_client'].includes(normalizedProject)
      ? 'cancelled'
      : normalizedProject === 'completed'
        ? 'completed'
        : ['review', 'pending_review'].includes(normalizedProject)
          ? 'review'
          : normalizedProject === 'pending'
            ? 'project_pending'
            : normalizedProject === 'on_hold'
              ? 'on_hold'
              : normalizedProject === 'maintenance'
                ? 'maintenance'
                : 'project_active';

    const projectLabel = projectKey === 'completed'
      ? 'Completed'
      : projectKey === 'cancelled'
        ? 'Cancelled'
        : projectKey === 'review'
          ? 'Ready for review'
          : projectKey === 'project_pending'
            ? 'Project setup'
            : projectKey === 'on_hold'
              ? 'On hold'
              : projectKey === 'maintenance'
                ? 'Maintenance'
                : 'Project active';

    const projectStepLabel = projectKey === 'completed'
      ? 'Project completed'
      : projectKey === 'cancelled'
        ? 'Project cancelled'
        : projectKey === 'review'
          ? 'Project review'
          : projectKey === 'project_pending'
            ? 'Project setup'
            : projectKey === 'on_hold'
              ? 'Project on hold'
              : projectKey === 'maintenance'
                ? 'Project maintenance'
                : 'Project active';

    const labels = [
      ...LEAD_STAGES,
      { key: 'project', label: projectStepLabel },
      { key: 'completed', label: 'Completed' },
    ];
    const currentIndex = projectKey === 'completed' ? labels.length - 1 : 5;

    return {
      key: projectKey,
      label: projectLabel,
      steps: labels.map((step, index) => ({
        ...step,
        completed: projectKey === 'cancelled' ? index < 5 : index <= currentIndex,
        current: index === currentIndex,
      })),
    };
  }

  if (normalizedLead === 'lost') {
    return {
      key: 'lost',
      label: 'Not proceeding',
      steps: LEAD_STAGES.map((step) => ({ ...step, completed: false, current: false })),
    };
  }

  const leadIndex = normalizedLead === 'contacted'
    ? 1
    : normalizedLead === 'qualified'
      ? 2
      : normalizedLead === 'proposal'
        ? 3
        : normalizedLead === 'won'
          ? 4
          : 0;

  return {
    key: normalizedLead || 'submitted',
    label: normalizedLead === 'won' ? 'Converted' : LEAD_STAGES[leadIndex].label,
    steps: LEAD_STAGES.map((step, index) => ({
      ...step,
      completed: index <= leadIndex,
      current: index === leadIndex,
    })),
  };
}

export function getClientProjectPresentation(
  status: string | null | undefined,
): ClientProjectPresentation {
  const normalized = String(status || '').trim().toLowerCase();

  switch (normalized) {
    case 'pending':
      return { label: 'Project setup', nextAction: 'Review your project details' };
    case 'in_progress':
      return { label: 'In progress', nextAction: 'Review project progress' };
    case 'review':
    case 'pending_review':
      return { label: 'Ready for review', nextAction: 'Review the latest project update' };
    case 'completed':
      return { label: 'Completed', nextAction: 'Review your completed project' };
    case 'cancelled':
    case 'cancelled_by_client':
      return { label: 'Cancelled', nextAction: 'Contact Avelixa if you need help' };
    case 'on_hold':
      return { label: 'On hold', nextAction: 'Review the latest project update' };
    case 'maintenance':
      return { label: 'Maintenance', nextAction: 'Review your project' };
    default:
      return {
        label: normalized
          ? normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
          : 'Pending',
        nextAction: 'Review your project details',
      };
  }
}
