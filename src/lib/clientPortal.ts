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
    const projectKey = normalizedProject === 'completed'
      ? 'completed'
      : normalizedProject === 'cancelled'
        ? 'cancelled'
        : normalizedProject === 'review'
          ? 'review'
          : normalizedProject === 'pending'
            ? 'project_pending'
            : 'project_active';

    const projectLabel = projectKey === 'completed'
      ? 'Completed'
      : projectKey === 'cancelled'
        ? 'Cancelled'
        : projectKey === 'review'
          ? 'Ready for review'
          : projectKey === 'project_pending'
            ? 'Project setup'
            : 'Project active';

    const projectIndex = projectKey === 'completed' ? 4 : 5;
    const labels = [...LEAD_STAGES, { key: 'project', label: 'Project active' }, { key: 'completed', label: 'Completed' }];
    const currentIndex = projectKey === 'completed' ? labels.length - 1 : projectIndex;

    return {
      key: projectKey,
      label: projectLabel,
      steps: labels.map((step, index) => ({
        ...step,
        completed: index <= currentIndex,
        current: index === currentIndex,
      })),
    };
  }

  if (normalizedLead === 'lost') {
    return {
      key: 'lost',
      label: 'Not proceeding',
      steps: LEAD_STAGES.map((step, index) => ({ ...step, completed: index < 0, current: false })),
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
