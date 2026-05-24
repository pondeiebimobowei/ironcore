import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import {
  BillingCycle,
  MemberStatus,
  MembershipStatus,
  MessageDirection,
  MessageStatus,
  OrganizationMembershipStatus,
  OrganizationRole,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  TaskPriority,
  TaskStatus,
  TaskType,
  TimelineEventType,
  WorkflowDefinitionStatus,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowType,
} from '@prisma/client';

const taskTitles: Record<TaskType, string> = {
  [TaskType.VERIFY_PAYMENT]: 'Verify payment',
  [TaskType.FOLLOW_UP_MEMBER]: 'Follow up with member',
  [TaskType.RESOLVE_OVERDUE_STATUS]: 'Resolve overdue status',
  [TaskType.REVIEW_AT_RISK_MEMBER]: 'Review at-risk member',
  [TaskType.REACTIVATION]: 'Start reactivation',
};

const taskPriorities: Record<TaskType, TaskPriority> = {
  [TaskType.VERIFY_PAYMENT]: TaskPriority.HIGH,
  [TaskType.FOLLOW_UP_MEMBER]: TaskPriority.LOW,
  [TaskType.RESOLVE_OVERDUE_STATUS]: TaskPriority.HIGH,
  [TaskType.REVIEW_AT_RISK_MEMBER]: TaskPriority.HIGH,
  [TaskType.REACTIVATION]: TaskPriority.MEDIUM,
};

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://ironcore:ironcore@localhost:5432/ironcore';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const demoOrganizationSlug = 'peak-performance-gym';
const legacyDemoOrganizationSlug = 'demo-fitness-studio';
const demoOwnerEmail = 'john@peakperformance.local';
const demoOwnerPassword = 'password123';

type DemoMember = {
  firstName: string;
  lastName: string;
  status: MemberStatus;
  planName: 'Starter' | 'Plus' | 'Elite';
  expiryOffsetDays: number;
  notes?: string;
};

const demoMembers: DemoMember[] = [
  {
    firstName: 'Ada',
    lastName: 'Okonkwo',
    status: MemberStatus.ACTIVE,
    planName: 'Plus',
    expiryOffsetDays: 24,
  },
  {
    firstName: 'Tunde',
    lastName: 'Adebayo',
    status: MemberStatus.ACTIVE,
    planName: 'Starter',
    expiryOffsetDays: 18,
  },
  {
    firstName: 'Maya',
    lastName: 'Cole',
    status: MemberStatus.ACTIVE,
    planName: 'Elite',
    expiryOffsetDays: 41,
  },
  {
    firstName: 'Kemi',
    lastName: 'Bello',
    status: MemberStatus.ACTIVE,
    planName: 'Plus',
    expiryOffsetDays: 12,
  },
  {
    firstName: 'Ife',
    lastName: 'Nwosu',
    status: MemberStatus.ACTIVE,
    planName: 'Starter',
    expiryOffsetDays: 28,
  },
  {
    firstName: 'Daniel',
    lastName: 'Hart',
    status: MemberStatus.ACTIVE,
    planName: 'Elite',
    expiryOffsetDays: 55,
  },
  {
    firstName: 'Zainab',
    lastName: 'Yusuf',
    status: MemberStatus.ACTIVE,
    planName: 'Plus',
    expiryOffsetDays: 33,
  },
  {
    firstName: 'Noah',
    lastName: 'Grant',
    status: MemberStatus.ACTIVE,
    planName: 'Starter',
    expiryOffsetDays: 20,
  },
  {
    firstName: 'Chioma',
    lastName: 'Eze',
    status: MemberStatus.EXPIRING,
    planName: 'Plus',
    expiryOffsetDays: 3,
  },
  {
    firstName: 'Seyi',
    lastName: 'Falade',
    status: MemberStatus.EXPIRING,
    planName: 'Elite',
    expiryOffsetDays: 5,
  },
  {
    firstName: 'Lara',
    lastName: 'King',
    status: MemberStatus.EXPIRING,
    planName: 'Starter',
    expiryOffsetDays: 7,
  },
  {
    firstName: 'Victor',
    lastName: 'Mensah',
    status: MemberStatus.EXPIRING,
    planName: 'Plus',
    expiryOffsetDays: 2,
  },
  {
    firstName: 'Amina',
    lastName: 'Lawal',
    status: MemberStatus.EXPIRING,
    planName: 'Starter',
    expiryOffsetDays: 6,
  },
  {
    firstName: 'David',
    lastName: 'Stone',
    status: MemberStatus.OVERDUE,
    planName: 'Plus',
    expiryOffsetDays: -4,
  },
  {
    firstName: 'Bukola',
    lastName: 'Ade',
    status: MemberStatus.OVERDUE,
    planName: 'Starter',
    expiryOffsetDays: -9,
  },
  {
    firstName: 'Emeka',
    lastName: 'Udo',
    status: MemberStatus.OVERDUE,
    planName: 'Elite',
    expiryOffsetDays: -12,
  },
  {
    firstName: 'Grace',
    lastName: 'Ibrahim',
    status: MemberStatus.OVERDUE,
    planName: 'Plus',
    expiryOffsetDays: -2,
  },
  {
    firstName: 'Hassan',
    lastName: 'Ali',
    status: MemberStatus.OVERDUE,
    planName: 'Starter',
    expiryOffsetDays: -16,
  },
  {
    firstName: 'Nora',
    lastName: 'James',
    status: MemberStatus.AT_RISK,
    planName: 'Plus',
    expiryOffsetDays: -21,
    notes: 'Missed two recovery messages; prefers evening calls.',
  },
  {
    firstName: 'Samuel',
    lastName: 'Ojo',
    status: MemberStatus.AT_RISK,
    planName: 'Elite',
    expiryOffsetDays: -25,
    notes: 'Requested temporary pause but has not confirmed renewal.',
  },
  {
    firstName: 'Fatima',
    lastName: 'Usman',
    status: MemberStatus.AT_RISK,
    planName: 'Starter',
    expiryOffsetDays: -19,
    notes: 'Payment proof was rejected due to unreadable receipt.',
  },
  {
    firstName: 'Peter',
    lastName: 'Clark',
    status: MemberStatus.AT_RISK,
    planName: 'Plus',
    expiryOffsetDays: -30,
    notes: 'No response after final overdue reminder.',
  },
  {
    firstName: 'Tara',
    lastName: 'Singh',
    status: MemberStatus.PENDING_VERIFICATION,
    planName: 'Elite',
    expiryOffsetDays: -1,
    notes: 'Uploaded transfer proof awaiting review.',
  },
  {
    firstName: 'Jonah',
    lastName: 'Reed',
    status: MemberStatus.PENDING_VERIFICATION,
    planName: 'Plus',
    expiryOffsetDays: 0,
    notes: 'Cash payment captured by front desk.',
  },
  {
    firstName: 'Maryam',
    lastName: 'Bashir',
    status: MemberStatus.CHURNED,
    planName: 'Starter',
    expiryOffsetDays: -64,
    notes: 'Marked churned after 60 days without renewal.',
  },
  {
    firstName: 'Kelvin',
    lastName: 'Moore',
    status: MemberStatus.CHURNED,
    planName: 'Plus',
    expiryOffsetDays: -78,
    notes: 'Stopped attending and declined recovery offer.',
  },
  {
    firstName: 'Rita',
    lastName: 'Obi',
    status: MemberStatus.CHURNED,
    planName: 'Elite',
    expiryOffsetDays: -90,
    notes: 'Moved out of service area.',
  },
  {
    firstName: 'Amara',
    lastName: 'Johnson',
    status: MemberStatus.ACTIVE,
    planName: 'Plus',
    expiryOffsetDays: 29,
    notes: 'Reactivated from overdue after WhatsApp recovery.',
  },
  {
    firstName: 'Bamidele',
    lastName: 'Cole',
    status: MemberStatus.ACTIVE,
    planName: 'Starter',
    expiryOffsetDays: 16,
    notes: 'Reactivated after staff follow-up call.',
  },
  {
    firstName: 'Elena',
    lastName: 'Martins',
    status: MemberStatus.ACTIVE,
    planName: 'Elite',
    expiryOffsetDays: 45,
    notes: 'Reactivated with annual upgrade offer.',
  },
];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const clearOrganizationBySlug = async (
  tx: Prisma.TransactionClient,
  slug: string,
) => {
  const organization = await tx.organization.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!organization) {
    return;
  }

  const where = { organizationId: organization.id };

  await tx.messageLog.deleteMany({ where });
  await tx.workflowStep.deleteMany({ where });
  await tx.workflow.deleteMany({ where });
  await tx.task.deleteMany({ where });
  await tx.timelineEvent.deleteMany({ where });
  await tx.payment.deleteMany({ where });
  await tx.membership.deleteMany({ where });
  await tx.plan.deleteMany({ where });
  await tx.organizationInvitation.deleteMany({ where });

  const memberships = await tx.organizationMembership.findMany({
    where,
    select: { id: true },
  });
  const users = await tx.user.findMany({
    where: {
      organizationMemberships: {
        some: { organizationId: organization.id },
      },
    },
    select: { id: true },
  });

  await tx.organizationMembership.deleteMany({
    where: { id: { in: memberships.map((membership) => membership.id) } },
  });
  await tx.member.deleteMany({ where });
  await tx.organization.delete({ where: { id: organization.id } });
  await tx.user.deleteMany({
    where: {
      id: { in: users.map((user) => user.id) },
      organizationMemberships: { none: {} },
    },
  });
};

const clearDemoOrganization = async (tx: Prisma.TransactionClient) => {
  await clearOrganizationBySlug(tx, demoOrganizationSlug);
  await clearOrganizationBySlug(tx, legacyDemoOrganizationSlug);
};

const workflowTemplates = (type: WorkflowType) => {
  if (type === WorkflowType.RENEWAL_REMINDER) {
    return [
      {
        dayOffset: -7,
        messageTemplate:
          'Hi {{firstName}}, your membership expires soon. Renew now to keep your training streak alive.',
      },
      {
        dayOffset: -3,
        messageTemplate:
          'Quick reminder: your IronCore membership expires in a few days. Reply PAID once you renew.',
      },
      {
        dayOffset: 0,
        messageTemplate:
          'Your membership expires today. Send proof after payment and we will verify it quickly.',
      },
    ];
  }

  if (type === WorkflowType.OVERDUE_RECOVERY) {
    return [
      {
        dayOffset: 1,
        messageTemplate:
          'Hi {{firstName}}, your membership is overdue. You can renew by bank transfer and send proof here.',
      },
      {
        dayOffset: 3,
        messageTemplate:
          'We have kept your slot open. Please renew today or let us know if you need help.',
      },
      {
        dayOffset: 7,
        messageTemplate:
          'Final reminder before your account is marked at risk. Reply RENEW to continue.',
      },
    ];
  }

  return [
    {
      dayOffset: 0,
      messageTemplate:
        'Hi {{firstName}}, we miss you at IronCore. Restart this week and we will waive the restart fee.',
    },
    {
      dayOffset: 4,
      messageTemplate:
        'Your reactivation offer is still open. Reply START and our team will help you return.',
    },
  ];
};

type WorkflowDefinitionSeed = {
  key: string;
  name: string;
  description: string;
  category: string;
  status: WorkflowDefinitionStatus;
  trigger: string;
  goal: string;
  audience: string;
  editor: 'owner' | 'admin' | 'manager' | 'analyst';
  startedOffsetDays?: number;
  lastEditedOffsetDays: number;
  steps: Array<{
    dayOffset: number;
    label: string;
    messageTemplate: string;
    createsTask?: boolean;
  }>;
};

const workflowDefinitionSeeds: WorkflowDefinitionSeed[] = [
  {
    key: 'active-renewal',
    name: 'Renewal Recovery',
    description: 'Reminder sequence for upcoming expirations',
    category: 'Renewal',
    status: WorkflowDefinitionStatus.ACTIVE,
    trigger: 'Membership expires in 5 days',
    goal: 'Prevent overdue & reduce churn',
    audience: 'Expiring soon members',
    editor: 'owner',
    startedOffsetDays: -23,
    lastEditedOffsetDays: -4,
    steps: [
      {
        dayOffset: -5,
        label: 'Reminder: 5 days before expiry',
        messageTemplate:
          'Hi {{firstName}}, your membership expires in 5 days. Renew now to keep training without interruption.',
      },
      {
        dayOffset: 0,
        label: 'Expiry day notice',
        messageTemplate:
          'Your membership expires today. Send proof after payment and we will verify it quickly.',
      },
      {
        dayOffset: 3,
        label: 'Overdue follow-up',
        messageTemplate:
          'Hi {{firstName}}, your membership is overdue. Please renew today or reply if you need help.',
        createsTask: true,
      },
      {
        dayOffset: 7,
        label: 'Escalation message',
        messageTemplate:
          'We have kept your slot open. Please renew today or let us know if you need help.',
        createsTask: true,
      },
      {
        dayOffset: 14,
        label: 'Final reminder & offer',
        messageTemplate:
          'Final reminder before your account is marked at risk. Reply RENEW to continue.',
        createsTask: true,
      },
    ],
  },
  {
    key: 'active-overdue',
    name: 'Overdue Follow-up',
    description: 'Follow-up sequence for overdue members',
    category: 'Overdue',
    status: WorkflowDefinitionStatus.ACTIVE,
    trigger: 'Membership becomes overdue',
    goal: 'Recover overdue revenue',
    audience: 'Overdue members',
    editor: 'admin',
    startedOffsetDays: -20,
    lastEditedOffsetDays: -3,
    steps: [
      {
        dayOffset: 1,
        label: 'First overdue reminder',
        messageTemplate:
          'Hi {{firstName}}, your membership is overdue. You can renew by bank transfer and send proof here.',
      },
      {
        dayOffset: 3,
        label: 'Follow-up message',
        messageTemplate:
          'We have kept your slot open. Please renew today or let us know if you need help.',
      },
      {
        dayOffset: 7,
        label: 'Escalation task',
        messageTemplate:
          'Final reminder before your account is marked at risk. Reply RENEW to continue.',
        createsTask: true,
      },
    ],
  },
  {
    key: 'active-reactivation',
    name: 'Reactivation Campaign',
    description: 'Win-back sequence for inactive/churned members',
    category: 'Reactivation',
    status: WorkflowDefinitionStatus.ACTIVE,
    trigger: 'Member is marked churned',
    goal: 'Win back inactive members',
    audience: 'Churned members',
    editor: 'manager',
    startedOffsetDays: -18,
    lastEditedOffsetDays: -2,
    steps: [
      {
        dayOffset: 0,
        label: 'Reactivation offer',
        messageTemplate:
          'Hi {{firstName}}, we miss you at IronCore. Restart this week and we will waive the restart fee.',
      },
      {
        dayOffset: 4,
        label: 'Offer reminder',
        messageTemplate:
          'Your reactivation offer is still open. Reply START and our team will help you return.',
      },
    ],
  },
  {
    key: 'active-incentive',
    name: 'Win-back Incentive',
    description: 'Special offers for inactive high-value members',
    category: 'Incentive',
    status: WorkflowDefinitionStatus.ACTIVE,
    trigger: 'High-value member is inactive',
    goal: 'Recover high-value accounts',
    audience: 'Inactive elite plan members',
    editor: 'analyst',
    startedOffsetDays: -16,
    lastEditedOffsetDays: -2,
    steps: [
      {
        dayOffset: 0,
        label: 'Send incentive',
        messageTemplate:
          'Hi {{firstName}}, your return offer is ready. Reply OFFER to claim it.',
      },
    ],
  },
  {
    key: 'active-welcome',
    name: 'Welcome Sequence',
    description: 'Onboarding messages for new members',
    category: 'Onboarding',
    status: WorkflowDefinitionStatus.ACTIVE,
    trigger: 'New member joins',
    goal: 'Improve first-week engagement',
    audience: 'New members',
    editor: 'admin',
    startedOffsetDays: -30,
    lastEditedOffsetDays: -7,
    steps: [
      {
        dayOffset: 0,
        label: 'Welcome message',
        messageTemplate:
          'Welcome to Peak Performance, {{firstName}}. We are glad you are here.',
      },
    ],
  },
  {
    key: 'active-upgrade',
    name: 'Upgrade Nudge',
    description: 'Encourage plan upgrades for engaged members',
    category: 'Upgrade',
    status: WorkflowDefinitionStatus.ACTIVE,
    trigger: 'Member attends consistently',
    goal: 'Increase plan upgrades',
    audience: 'Highly engaged members',
    editor: 'owner',
    startedOffsetDays: -12,
    lastEditedOffsetDays: -5,
    steps: [
      {
        dayOffset: 0,
        label: 'Upgrade invitation',
        messageTemplate:
          'Hi {{firstName}}, your training streak qualifies you for an upgrade consult.',
      },
    ],
  },
  {
    key: 'paused-payment-retry',
    name: 'Payment Retry Sequence',
    description: 'Retry failed payments automatically',
    category: 'Payment',
    status: WorkflowDefinitionStatus.PAUSED,
    trigger: 'Payment fails',
    goal: 'Recover failed payments',
    audience: 'Members with failed payments',
    editor: 'owner',
    startedOffsetDays: -6,
    lastEditedOffsetDays: -1,
    steps: [
      {
        dayOffset: 0,
        label: 'Payment failed',
        messageTemplate:
          'Hi {{firstName}}, your payment failed. Please update payment details.',
      },
      {
        dayOffset: 1,
        label: 'Retry payment',
        messageTemplate:
          'We will retry your membership payment today. Reply HELP if needed.',
      },
      {
        dayOffset: 3,
        label: 'Reminder email',
        messageTemplate:
          'Your membership payment still needs attention. Please contact the front desk.',
      },
      {
        dayOffset: 7,
        label: 'Final notice',
        messageTemplate:
          'Final notice before your membership access is paused.',
        createsTask: true,
      },
      {
        dayOffset: 10,
        label: 'Escalation notice',
        messageTemplate:
          'We need staff review for your failed payment recovery.',
        createsTask: true,
      },
    ],
  },
  {
    key: 'paused-winback',
    name: 'Win-back Campaign',
    description: 'Re-engage inactive members',
    category: 'Retention',
    status: WorkflowDefinitionStatus.PAUSED,
    trigger: 'Member inactive for 45 days',
    goal: 'Recover inactive members',
    audience: 'Inactive members',
    editor: 'manager',
    startedOffsetDays: -10,
    lastEditedOffsetDays: -4,
    steps: [
      {
        dayOffset: 0,
        label: 'Win-back offer',
        messageTemplate: 'Hi {{firstName}}, we would love to see you again.',
      },
    ],
  },
  {
    key: 'paused-overdue',
    name: 'Overdue Reminder',
    description: 'Remind members with overdue payments',
    category: 'Payment',
    status: WorkflowDefinitionStatus.PAUSED,
    trigger: 'Payment is overdue',
    goal: 'Recover overdue payments',
    audience: 'Overdue members',
    editor: 'admin',
    startedOffsetDays: -8,
    lastEditedOffsetDays: -4,
    steps: [
      {
        dayOffset: 0,
        label: 'Overdue notice',
        messageTemplate:
          'Hi {{firstName}}, your payment is overdue. Please renew today.',
      },
    ],
  },
  {
    key: 'paused-birthday',
    name: 'Birthday Offer',
    description: 'Send special offers on member birthdays',
    category: 'Engagement',
    status: WorkflowDefinitionStatus.PAUSED,
    trigger: 'Member birthday',
    goal: 'Increase member loyalty',
    audience: 'Members with birthdays this month',
    editor: 'analyst',
    startedOffsetDays: -9,
    lastEditedOffsetDays: -5,
    steps: [
      {
        dayOffset: 0,
        label: 'Birthday offer',
        messageTemplate:
          'Happy birthday {{firstName}}. Enjoy a special offer from Peak Performance.',
      },
    ],
  },
  {
    key: 'paused-referral',
    name: 'Referral Incentive',
    description: 'Reward members for referring others',
    category: 'Growth',
    status: WorkflowDefinitionStatus.PAUSED,
    trigger: 'Referral tag added',
    goal: 'Increase referrals',
    audience: 'Members who refer friends',
    editor: 'manager',
    startedOffsetDays: -7,
    lastEditedOffsetDays: -6,
    steps: [
      {
        dayOffset: 0,
        label: 'Referral reward',
        messageTemplate:
          'Thanks for the referral, {{firstName}}. Your reward is ready.',
      },
    ],
  },
  {
    key: 'paused-upgrade',
    name: 'Upgrade Nudge',
    description: 'Encourage members to upgrade their plan',
    category: 'Upsell',
    status: WorkflowDefinitionStatus.PAUSED,
    trigger: 'Member reaches visit threshold',
    goal: 'Increase upgrades',
    audience: 'Engaged standard plan members',
    editor: 'owner',
    startedOffsetDays: -11,
    lastEditedOffsetDays: -7,
    steps: [
      {
        dayOffset: 0,
        label: 'Upgrade prompt',
        messageTemplate:
          'Hi {{firstName}}, you may be ready for our Elite plan.',
      },
    ],
  },
  {
    key: 'draft-card-retry',
    name: 'Expired Card Retry',
    description: 'Retry failed payments due to expired cards',
    category: 'Payment',
    status: WorkflowDefinitionStatus.DRAFT,
    trigger: 'Payment fails due to expired card',
    goal: 'Recover failed payments',
    audience: 'Members with expired cards',
    editor: 'admin',
    lastEditedOffsetDays: -1,
    steps: [
      {
        dayOffset: 0,
        label: 'Card failure notice',
        messageTemplate:
          'Hi {{firstName}}, your card appears expired. Please update your payment method.',
      },
    ],
  },
  {
    key: 'draft-reengagement-email',
    name: 'Re-engagement Email Series',
    description: 'Re-engage inactive members with value-driven emails',
    category: 'Engagement',
    status: WorkflowDefinitionStatus.DRAFT,
    trigger: 'Member inactive for 30 days',
    goal: 'Restart member engagement',
    audience: 'Inactive members',
    editor: 'manager',
    lastEditedOffsetDays: -1,
    steps: [
      {
        dayOffset: 0,
        label: 'First re-engagement email',
        messageTemplate:
          'Hi {{firstName}}, here is what is new at Peak Performance.',
      },
    ],
  },
  {
    key: 'draft-lapsed-winback',
    name: 'Lapsed Member Win-back',
    description: 'Win back members who cancelled their membership',
    category: 'Retention',
    status: WorkflowDefinitionStatus.DRAFT,
    trigger: 'Membership cancelled',
    goal: 'Recover lapsed members',
    audience: 'Cancelled members',
    editor: 'analyst',
    lastEditedOffsetDays: -2,
    steps: [
      {
        dayOffset: 0,
        label: 'Lapsed member offer',
        messageTemplate:
          'Hi {{firstName}}, we can help you restart with a lighter plan.',
      },
    ],
  },
  {
    key: 'draft-high-value-offer',
    name: 'Special Offer for High Value',
    description: 'Offer discounts to high-value members at risk',
    category: 'Incentive',
    status: WorkflowDefinitionStatus.DRAFT,
    trigger: 'High-value member becomes at risk',
    goal: 'Retain high-value members',
    audience: 'High-value at-risk members',
    editor: 'owner',
    lastEditedOffsetDays: -2,
    steps: [
      {
        dayOffset: 0,
        label: 'Special offer',
        messageTemplate:
          'Hi {{firstName}}, we created a special retention offer for you.',
      },
    ],
  },
  {
    key: 'draft-expiry-reminder',
    name: 'Membership Expiry Reminder',
    description: 'Remind members before their membership expires',
    category: 'Onboarding',
    status: WorkflowDefinitionStatus.DRAFT,
    trigger: 'Membership expires soon',
    goal: 'Prevent expiry',
    audience: 'Expiring members',
    editor: 'admin',
    lastEditedOffsetDays: -3,
    steps: [
      {
        dayOffset: -5,
        label: 'Expiry reminder',
        messageTemplate:
          'Hi {{firstName}}, your membership expires soon. Renew to keep training.',
      },
    ],
  },
  {
    key: 'draft-feedback',
    name: 'Feedback Request',
    description: 'Collect feedback after successful recoveries',
    category: 'Engagement',
    status: WorkflowDefinitionStatus.DRAFT,
    trigger: 'Payment recovery completed',
    goal: 'Improve recovery experience',
    audience: 'Recovered members',
    editor: 'analyst',
    lastEditedOffsetDays: -3,
    steps: [
      {
        dayOffset: 1,
        label: 'Feedback request',
        messageTemplate:
          'Thanks for renewing, {{firstName}}. How was your recovery experience?',
      },
    ],
  },
];

const seedWorkflowDefinitions = async (
  tx: Prisma.TransactionClient,
  organizationId: string,
  editors: Record<WorkflowDefinitionSeed['editor'], { id: string }>,
  today: Date,
) => {
  const definitions = new Map<string, string>();

  for (const seed of workflowDefinitionSeeds) {
    const editor = editors[seed.editor];
    const definition = await tx.workflowDefinition.create({
      data: {
        organizationId,
        name: seed.name,
        description: seed.description,
        category: seed.category,
        status: seed.status,
        trigger: seed.trigger,
        goal: seed.goal,
        audience: seed.audience,
        timezone: 'Africa/Lagos (WAT)',
        startedAt:
          seed.status === WorkflowDefinitionStatus.DRAFT
            ? null
            : addDays(today, seed.startedOffsetDays ?? -1),
        lastEditedAt: addDays(today, seed.lastEditedOffsetDays),
        lastEditedById: editor.id,
        steps: {
          create: seed.steps.map((step, index) => ({
            dayOffset: step.dayOffset,
            label: step.label,
            messageTemplate: step.messageTemplate,
            createsTask: step.createsTask ?? false,
            sortOrder: index,
          })),
        },
      },
    });
    definitions.set(seed.key, definition.id);
  }

  return definitions;
};

async function main() {
  const today = startOfToday();

  await prisma.$transaction(async (tx) => {
    await clearDemoOrganization(tx);

    const organization = await tx.organization.create({
      data: {
        name: 'Peak Performance Gym',
        slug: demoOrganizationSlug,
        tagline: 'Stronger Every Day',
        description:
          'A focused fitness facility helping members recover momentum, renew on time, and stay consistent.',
        establishedYear: 2021,
        businessType: 'Personal Training Gym',
        organizationSize: '6-20',
        websiteUrl: 'https://peakperformance.local',
        contactEmail: 'info@peakperformance.local',
        primaryPhone: '+234 801 234 5678',
        secondaryPhone: '+234 809 876 5432',
        addressLine: '12 Freedom Way, Lekki Phase 1',
        city: 'Lagos',
        state: 'Lagos',
        postalCode: '106104',
        country: 'Nigeria',
        businessHours: [
          {
            label: 'Monday - Friday',
            opensAt: '05:00 AM',
            closesAt: '10:00 PM',
            isOpen: true,
          },
          {
            label: 'Saturday',
            opensAt: '07:00 AM',
            closesAt: '10:00 PM',
            isOpen: true,
          },
          {
            label: 'Sunday',
            opensAt: '07:00 AM',
            closesAt: '05:00 PM',
            isOpen: true,
          },
        ],
        closedOnPublicHolidays: false,
        logoUrl: null,
        imageUrls: [],
      },
    });

    const owner = await tx.user.create({
      data: {
        fullName: 'John Adebayo',
        email: demoOwnerEmail,
        passwordHash: await hash(demoOwnerPassword, 12),
      },
    });

    const [admin, manager, analyst] = await Promise.all([
      tx.user.create({
        data: {
          fullName: 'Olivia Davis',
          email: 'olivia@peakperformance.local',
          passwordHash: await hash(demoOwnerPassword, 12),
        },
      }),
      tx.user.create({
        data: {
          fullName: 'Michael Osei',
          email: 'michael@peakperformance.local',
          passwordHash: await hash(demoOwnerPassword, 12),
        },
      }),
      tx.user.create({
        data: {
          fullName: 'Sophia Ahmed',
          email: 'sophia@peakperformance.local',
          passwordHash: await hash(demoOwnerPassword, 12),
        },
      }),
    ]);

    await tx.organizationMembership.createMany({
      data: [
        {
          organizationId: organization.id,
          userId: owner.id,
          role: OrganizationRole.OWNER,
          status: OrganizationMembershipStatus.ACTIVE,
          acceptedAt: today,
        },
        {
          organizationId: organization.id,
          userId: admin.id,
          role: OrganizationRole.ADMIN,
          status: OrganizationMembershipStatus.ACTIVE,
          acceptedAt: today,
        },
        {
          organizationId: organization.id,
          userId: manager.id,
          role: OrganizationRole.STAFF,
          status: OrganizationMembershipStatus.ACTIVE,
          acceptedAt: today,
        },
        {
          organizationId: organization.id,
          userId: analyst.id,
          role: OrganizationRole.STAFF,
          status: OrganizationMembershipStatus.ACTIVE,
          acceptedAt: today,
        },
      ],
    });

    const planRows = [
      {
        name: 'Starter',
        billingCycle: BillingCycle.MONTHLY,
        amount: '65000.00',
      },
      { name: 'Plus', billingCycle: BillingCycle.MONTHLY, amount: '90000.00' },
      {
        name: 'Elite',
        billingCycle: BillingCycle.MONTHLY,
        amount: '120000.00',
      },
    ];

    const plans = new Map<string, Awaited<ReturnType<typeof tx.plan.create>>>();

    for (const plan of planRows) {
      const created = await tx.plan.create({
        data: {
          organizationId: organization.id,
          name: plan.name,
          billingCycle: plan.billingCycle,
          amount: plan.amount,
          currency: 'NGN',
        },
      });
      plans.set(plan.name, created);
    }

    const workflowDefinitions = await seedWorkflowDefinitions(
      tx,
      organization.id,
      { owner, admin, manager, analyst },
      today,
    );

    for (const [index, demoMember] of demoMembers.entries()) {
      const plan = plans.get(demoMember.planName);

      if (!plan) {
        throw new Error(`Missing plan ${demoMember.planName}`);
      }

      const member = await tx.member.create({
        data: {
          organizationId: organization.id,
          firstName: demoMember.firstName,
          lastName: demoMember.lastName,
          phoneNumber: `+234801000${String(index + 1).padStart(4, '0')}`,
          email: `${demoMember.firstName.toLowerCase()}.${demoMember.lastName.toLowerCase()}@example.com`,
          status: demoMember.status,
          notes: demoMember.notes,
        },
      });

      const expiryDate = addDays(today, demoMember.expiryOffsetDays);
      const startDate = addDays(expiryDate, -30);
      const membershipStatus =
        demoMember.status === MemberStatus.CHURNED ||
        demoMember.expiryOffsetDays < 0
          ? MembershipStatus.EXPIRED
          : MembershipStatus.ACTIVE;

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          memberId: member.id,
          planId: plan.id,
          startDate,
          expiryDate,
          status: membershipStatus,
          amount: plan.amount,
          currency: plan.currency,
        },
      });

      const paymentStatus =
        demoMember.status === MemberStatus.PENDING_VERIFICATION
          ? PaymentStatus.PENDING_VERIFICATION
          : demoMember.status === MemberStatus.AT_RISK && index % 2 === 0
            ? PaymentStatus.REJECTED
            : demoMember.status === MemberStatus.OVERDUE ||
                demoMember.status === MemberStatus.AT_RISK ||
                demoMember.status === MemberStatus.CHURNED
              ? PaymentStatus.PENDING_VERIFICATION
              : PaymentStatus.VERIFIED;

      const isVerified = paymentStatus === PaymentStatus.VERIFIED;
      const isRejected = paymentStatus === PaymentStatus.REJECTED;

      const payment = await tx.payment.create({
        data: {
          organizationId: organization.id,
          memberId: member.id,
          membershipId: membership.id,
          status: paymentStatus,
          amountExpected: plan.amount,
          amountPaid:
            isVerified ||
            demoMember.status === MemberStatus.PENDING_VERIFICATION
              ? plan.amount
              : null,
          proofUrl:
            isVerified ||
            demoMember.status === MemberStatus.PENDING_VERIFICATION
              ? `https://example.com/demo-payment-proofs/${member.id}.jpg`
              : null,
          method:
            index % 4 === 0 ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER,
          reference: `ICR-DEMO-${String(index + 1).padStart(4, '0')}`,
          submittedAt: addDays(
            today,
            demoMember.expiryOffsetDays < 0 ? demoMember.expiryOffsetDays : -2,
          ),
          verifiedById: isVerified ? owner.id : null,
          verifiedAt: isVerified ? addDays(today, -1) : null,
          rejectionReason: isRejected
            ? 'Receipt image is unreadable; member needs to resend proof.'
            : null,
          notes: isVerified
            ? 'Verified demo payment.'
            : 'Seeded recovery payment state.',
        },
      });

      await tx.timelineEvent.createMany({
        data: [
          {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.MEMBER_CREATED,
            metadata: { source: 'demo_seed' },
            createdAt: addDays(startDate, -1),
          },
          {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.MEMBERSHIP_CREATED,
            metadata: { membershipId: membership.id, planName: plan.name },
            createdAt: startDate,
          },
          {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.MEMBER_STATUS_CHANGED,
            metadata: { status: demoMember.status },
            createdAt: addDays(
              expiryDate,
              demoMember.expiryOffsetDays < 0 ? 1 : -7,
            ),
          },
          {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.PAYMENT_CREATED,
            metadata: { paymentId: payment.id, status: payment.status },
            createdAt: payment.submittedAt,
          },
        ],
      });

      if (isVerified) {
        await tx.timelineEvent.create({
          data: {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.PAYMENT_VERIFIED,
            metadata: { paymentId: payment.id, verifiedById: owner.id },
            createdAt: payment.verifiedAt ?? today,
          },
        });
      }

      if (isRejected) {
        await tx.timelineEvent.create({
          data: {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.PAYMENT_REJECTED,
            metadata: {
              paymentId: payment.id,
              reason: payment.rejectionReason,
            },
            createdAt: addDays(today, -1),
          },
        });
      }

      const workflowStatuses = new Set<MemberStatus>([
        MemberStatus.EXPIRING,
        MemberStatus.OVERDUE,
        MemberStatus.AT_RISK,
        MemberStatus.CHURNED,
      ]);
      const needsWorkflow = workflowStatuses.has(demoMember.status);

      if (needsWorkflow || demoMember.notes?.includes('Reactivated')) {
        const workflowType =
          demoMember.status === MemberStatus.EXPIRING
            ? WorkflowType.RENEWAL_REMINDER
            : demoMember.status === MemberStatus.CHURNED ||
                demoMember.notes?.includes('Reactivated')
              ? WorkflowType.REACTIVATION
              : WorkflowType.OVERDUE_RECOVERY;
        const workflowDefinitionKey =
          demoMember.status === MemberStatus.EXPIRING
            ? 'active-renewal'
            : demoMember.status === MemberStatus.OVERDUE
              ? 'active-overdue'
              : demoMember.status === MemberStatus.AT_RISK
                ? index % 2 === 0
                  ? 'paused-payment-retry'
                  : 'paused-overdue'
                : 'active-reactivation';
        const workflowDefinitionId = workflowDefinitions.get(
          workflowDefinitionKey,
        );

        if (!workflowDefinitionId) {
          throw new Error(`Missing workflow definition ${workflowDefinitionKey}`);
        }

        const workflow = await tx.workflow.create({
          data: {
            organizationId: organization.id,
            workflowDefinitionId,
            memberId: member.id,
            membershipId: membership.id,
            type: workflowType,
            status:
              workflowDefinitionKey.startsWith('paused-') &&
              !demoMember.notes?.includes('Reactivated')
                ? WorkflowStatus.PAUSED
                : demoMember.notes?.includes('Reactivated')
                  ? WorkflowStatus.COMPLETED
                  : WorkflowStatus.ACTIVE,
            currentDayOffset:
              workflowType === WorkflowType.RENEWAL_REMINDER ? -3 : 3,
            triggerDate:
              workflowType === WorkflowType.RENEWAL_REMINDER
                ? expiryDate
                : addDays(expiryDate, 1),
            nextRunAt: demoMember.notes?.includes('Reactivated')
              ? null
              : addDays(today, 1),
            lastRunAt:
              demoMember.status === MemberStatus.CHURNED
                ? addDays(today, -14)
                : addDays(today, -1),
          },
        });

        await tx.timelineEvent.create({
          data: {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.WORKFLOW_CREATED,
            metadata: { workflowId: workflow.id, type: workflow.type },
            createdAt: workflow.createdAt,
          },
        });

        for (const [stepIndex, template] of workflowTemplates(
          workflowType,
        ).entries()) {
          const sent =
            stepIndex === 0 || demoMember.notes?.includes('Reactivated');
          const step = await tx.workflowStep.create({
            data: {
              workflowId: workflow.id,
              organizationId: organization.id,
              dayOffset: template.dayOffset,
              messageTemplate: template.messageTemplate,
              status: sent
                ? WorkflowStepStatus.SENT
                : WorkflowStepStatus.PENDING,
              executedAt: sent ? addDays(today, -stepIndex - 1) : null,
            },
          });

          if (sent) {
            await tx.messageLog.create({
              data: {
                organizationId: organization.id,
                memberId: member.id,
                workflowStepId: step.id,
                phoneNumber: member.phoneNumber,
                direction: MessageDirection.OUTBOUND,
                content: template.messageTemplate.replace(
                  '{{firstName}}',
                  member.firstName,
                ),
                status: MessageStatus.DELIVERED,
                sentAt: step.executedAt,
              },
            });

            if (index % 3 === 0) {
              await tx.messageLog.create({
                data: {
                  organizationId: organization.id,
                  memberId: member.id,
                  workflowStepId: step.id,
                  phoneNumber: member.phoneNumber,
                  direction: MessageDirection.INBOUND,
                  content:
                    demoMember.status === MemberStatus.EXPIRING
                      ? 'I will renew today.'
                      : 'Please send payment details.',
                  status: MessageStatus.DELIVERED,
                  sentAt: addDays(today, -stepIndex),
                },
              });
            }

            await tx.timelineEvent.create({
              data: {
                organizationId: organization.id,
                memberId: member.id,
                type: TimelineEventType.MESSAGE_SENT,
                metadata: { workflowStepId: step.id },
                createdAt: step.executedAt ?? today,
              },
            });
          }
        }
      }

      const taskType =
        demoMember.status === MemberStatus.PENDING_VERIFICATION
          ? TaskType.VERIFY_PAYMENT
          : demoMember.status === MemberStatus.OVERDUE
            ? TaskType.RESOLVE_OVERDUE_STATUS
            : demoMember.status === MemberStatus.AT_RISK
              ? TaskType.REVIEW_AT_RISK_MEMBER
              : demoMember.status === MemberStatus.CHURNED
                ? TaskType.REACTIVATION
                : demoMember.status === MemberStatus.EXPIRING
                  ? TaskType.FOLLOW_UP_MEMBER
                  : null;

      if (taskType) {
        const task = await tx.task.create({
          data: {
            organizationId: organization.id,
            memberId: member.id,
            title: taskTitles[taskType],
            type: taskType,
            priority: taskPriorities[taskType],
            status:
              taskType === TaskType.FOLLOW_UP_MEMBER
                ? TaskStatus.IN_PROGRESS
                : TaskStatus.OPEN,
            assignedToId: owner.id,
            dueDate: addDays(today, taskType === TaskType.REACTIVATION ? 5 : 1),
          },
        });

        await tx.timelineEvent.create({
          data: {
            organizationId: organization.id,
            memberId: member.id,
            type: TimelineEventType.TASK_CREATED,
            metadata: { taskId: task.id, type: task.type },
            createdAt: task.createdAt,
          },
        });
      }
    }
  });

  const [memberCount, paymentCount, taskCount, workflowCount] =
    await Promise.all([
      prisma.member.count({
        where: { organization: { slug: demoOrganizationSlug } },
      }),
      prisma.payment.count({
        where: { organization: { slug: demoOrganizationSlug } },
      }),
      prisma.task.count({
        where: { organization: { slug: demoOrganizationSlug } },
      }),
      prisma.workflow.count({
        where: { organization: { slug: demoOrganizationSlug } },
      }),
    ]);

  console.log(
    `Seeded ${demoOrganizationSlug}: ${memberCount} members, ${paymentCount} payments, ${workflowCount} workflows, ${taskCount} tasks.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
