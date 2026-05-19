import type { WorkflowTemplate } from "./types";

export const defaultWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: "renewal-reminder",
    name: "Renewal reminder",
    type: "RENEWAL_REMINDER",
    status: "ACTIVE",
    description: "Reminds members before their membership expires.",
    steps: [
      {
        id: "renewal-reminder-day-minus-5",
        dayOffset: -5,
        messageTemplate:
          "Hi {{firstName}}, your membership expires in 5 days. Renew now to keep training without interruption.",
        createsTask: false,
      },
    ],
  },
  {
    id: "overdue-follow-up",
    name: "Overdue follow-up",
    type: "OVERDUE_RECOVERY",
    status: "ACTIVE",
    description: "Follows up after a membership becomes overdue.",
    steps: [
      {
        id: "overdue-follow-up-day-plus-3",
        dayOffset: 3,
        messageTemplate:
          "Hi {{firstName}}, your membership is overdue. Please renew today or reply if you need help.",
        createsTask: true,
      },
    ],
  },
];
