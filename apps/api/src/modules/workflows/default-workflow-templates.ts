import { WorkflowType } from '@prisma/client';

export type DefaultWorkflowStepTemplate = {
  dayOffset: number;
  messageTemplate: string;
  createsTask: boolean;
};

export type DefaultWorkflowTemplate = {
  type: WorkflowType;
  name: string;
  steps: DefaultWorkflowStepTemplate[];
};

export const defaultWorkflowTemplates: DefaultWorkflowTemplate[] = [
  {
    type: WorkflowType.RENEWAL_REMINDER,
    name: 'Renewal reminder',
    steps: [
      {
        dayOffset: -5,
        messageTemplate:
          'Hi {{firstName}}, your membership expires in 5 days. Renew now to keep training without interruption.',
        createsTask: false,
      },
    ],
  },
  {
    type: WorkflowType.OVERDUE_RECOVERY,
    name: 'Overdue follow-up',
    steps: [
      {
        dayOffset: 3,
        messageTemplate:
          'Hi {{firstName}}, your membership is overdue. Please renew today or reply if you need help.',
        createsTask: true,
      },
    ],
  },
];
