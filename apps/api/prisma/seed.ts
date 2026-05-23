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
  TaskStatus,
  TaskType,
  TimelineEventType,
  WorkflowStatus,
  WorkflowStepStatus,
  WorkflowType,
} from '@prisma/client';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://ironcore:ironcore@localhost:5432/ironcore_retain';
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

async function main() {
  const today = startOfToday();

  await prisma.$transaction(async (tx) => {
    await clearDemoOrganization(tx);

    const organization = await tx.organization.create({
      data: {
        name: 'Peak Performance Gym',
        slug: demoOrganizationSlug,
      },
    });

    const owner = await tx.user.create({
      data: {
        email: demoOwnerEmail,
        passwordHash: await hash(demoOwnerPassword, 12),
      },
    });

    await tx.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId: owner.id,
        role: OrganizationRole.OWNER,
        status: OrganizationMembershipStatus.ACTIVE,
        acceptedAt: today,
      },
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

        const workflow = await tx.workflow.create({
          data: {
            organizationId: organization.id,
            memberId: member.id,
            membershipId: membership.id,
            type: workflowType,
            status: demoMember.notes?.includes('Reactivated')
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
            type: taskType,
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
