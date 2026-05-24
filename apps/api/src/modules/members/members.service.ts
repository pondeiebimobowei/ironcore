import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberStatus,
  MembershipStatus,
  Prisma,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import {
  ConfirmImportDto,
  ImportDuplicateStrategy,
  ImportMembersDto,
  ImportMemberRowDto,
} from './dto/import-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

type ListMembersQuery = {
  search?: string;
  status?: MemberStatus;
};

type ImportIssue = {
  row: number;
  message: string;
  field?: 'phoneNumber' | 'email';
  duplicateType?: 'file' | 'existing';
  existingMember?: {
    id: string;
    firstName: string;
    lastName: string | null;
    phoneNumber: string;
    email: string | null;
  };
};

type ImportReportRow = {
  row: number;
  data: ImportMemberRowDto;
  issues: ImportIssue[];
};

type ImportMembershipResult = {
  memberId: string;
  membershipId: string;
};

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: ListMembersQuery) {
    const search = query.search?.trim();

    return this.prisma.member.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: query.status,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        memberships: {
          orderBy: { expiryDate: 'desc' },
          take: 1,
          include: { plan: true },
        },
        payments: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async get(organizationId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        organizationId,
        deletedAt: null,
      },
      include: {
        memberships: {
          orderBy: { expiryDate: 'desc' },
          include: { plan: true, payments: true },
        },
        payments: { orderBy: { submittedAt: 'desc' } },
        messageLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
        tasks: { orderBy: { dueDate: 'asc' } },
        timelineEvents: { orderBy: { createdAt: 'desc' }, take: 30 },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async create(organizationId: string, dto: CreateMemberDto) {
    await this.ensureUniquePhone(organizationId, dto.phoneNumber);
    const organizationCurrency = dto.expiryDate
      ? await this.organizationCurrency(organizationId)
      : 'NGN';

    const member = await this.prisma.$transaction(async (tx) => {
      const createdMember = await tx.member.create({
        data: {
          organizationId,
          firstName: dto.firstName.trim(),
          lastName: this.optionalTrim(dto.lastName),
          phoneNumber: dto.phoneNumber.trim(),
          email: this.optionalTrim(dto.email),
          notes: this.optionalTrim(dto.notes),
        },
      });

      if (dto.expiryDate) {
        const plan = dto.planId
          ? await tx.plan.findFirst({
              where: { id: dto.planId, organizationId },
            })
          : null;
        const expiryDate = new Date(dto.expiryDate);
        const startDate = new Date(expiryDate);
        startDate.setDate(startDate.getDate() - 30);

        await tx.membership.create({
          data: {
            organizationId,
            memberId: createdMember.id,
            planId: plan?.id,
            startDate,
            expiryDate,
            status: MembershipStatus.ACTIVE,
            amount: plan?.amount ?? '0',
            currency: plan?.currency ?? organizationCurrency,
          },
        });
      }

      await tx.timelineEvent.create({
        data: {
          organizationId,
          memberId: createdMember.id,
          type: TimelineEventType.MEMBER_CREATED,
          metadata: { source: 'manual_create' },
        },
      });

      return createdMember;
    });

    return this.get(organizationId, member.id);
  }

  async update(organizationId: string, memberId: string, dto: UpdateMemberDto) {
    await this.get(organizationId, memberId);

    if (dto.phoneNumber) {
      const existing = await this.prisma.member.findFirst({
        where: {
          organizationId,
          phoneNumber: dto.phoneNumber,
          deletedAt: null,
          NOT: { id: memberId },
        },
      });

      if (existing) {
        throw new ConflictException(
          'A member with this phone number already exists',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id: memberId },
        data: {
          firstName: dto.firstName?.trim(),
          lastName: this.optionalTrim(dto.lastName),
          phoneNumber: dto.phoneNumber?.trim(),
          email: this.optionalTrim(dto.email),
          status: dto.status,
          notes: this.optionalTrim(dto.notes),
        },
      }),
      this.prisma.timelineEvent.create({
        data: {
          organizationId,
          memberId,
          type: dto.status
            ? TimelineEventType.MEMBER_STATUS_CHANGED
            : TimelineEventType.MEMBER_UPDATED,
          metadata: dto.status
            ? { status: dto.status }
            : { source: 'manual_update' },
        },
      }),
    ]);

    return this.get(organizationId, memberId);
  }

  async remove(organizationId: string, memberId: string) {
    await this.get(organizationId, memberId);

    await this.prisma.member.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  async import(organizationId: string, dto: ImportMembersDto) {
    const { validRows, errors, warningRows } = await this.validateImportRows(
      organizationId,
      dto.rows,
    );

    const warningErrors = warningRows.flatMap((row) =>
      row.issues.map((issue) => ({ row: issue.row, message: issue.message })),
    );

    if (errors.length > 0 || warningErrors.length > 0) {
      return { createdCount: 0, errors: [...errors, ...warningErrors] };
    }

    const createdMembers = await this.prisma.$transaction(async (tx) => {
      const organizationCurrency = await this.organizationCurrency(
        organizationId,
        tx,
      );
      const members = await Promise.all(
        validRows.map((row) =>
          tx.member.create({
            data: this.memberCreateData(organizationId, row),
          }),
        ),
      );
      const memberships = await this.createImportedMemberships(
        tx,
        organizationId,
        organizationCurrency,
        validRows.map((row, index) => ({
          row,
          memberId: members[index].id,
        })),
      );

      await tx.timelineEvent.createMany({
        data: [
          ...members.map((member) => ({
            organizationId,
            memberId: member.id,
            type: TimelineEventType.MEMBER_CREATED,
            metadata: { source: 'csv_import' },
          })),
          ...memberships.map((membership) => ({
            organizationId,
            memberId: membership.memberId,
            type: TimelineEventType.MEMBERSHIP_CREATED,
            metadata: {
              membershipId: membership.membershipId,
              source: 'csv_import',
            },
          })),
        ],
      });

      return members;
    });

    return { createdCount: createdMembers.length, errors: [] };
  }

  async dryRunImport(organizationId: string, dto: ImportMembersDto) {
    const { validRows, errorRows, warningRows } = await this.validateImportRows(
      organizationId,
      dto.rows,
    );

    return {
      validRows,
      warningRows,
      errorRows,
    };
  }

  async confirmImport(organizationId: string, dto: ConfirmImportDto) {
    const report = await this.validateImportRows(organizationId, dto.rows);

    if (report.errorRows.length > 0) {
      return {
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errors: report.errors,
      };
    }

    const resolutionByRow = new Map(
      dto.resolutions?.map((resolution) => [
        resolution.row,
        resolution.strategy,
      ]) ?? [],
    );
    const rowsByNumber = new Map(
      dto.rows.map((row, index) => [index + 1, row] as const),
    );
    const warningByRow = new Map(
      report.warningRows.map((row) => [row.row, row] as const),
    );
    const createRows: ImportMemberRowDto[] = [...report.validRows];
    const updateRows: Array<{ row: ImportMemberRowDto; memberId: string }> = [];
    let skippedCount = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const [rowNumber, warningRow] of warningByRow.entries()) {
      const strategy =
        resolutionByRow.get(rowNumber) ?? ImportDuplicateStrategy.SKIP_ROW;
      const row = rowsByNumber.get(rowNumber);
      const existingMember = warningRow.issues.find(
        (issue) => issue.duplicateType === 'existing',
      )?.existingMember;

      if (!row) {
        continue;
      }

      if (strategy === ImportDuplicateStrategy.SKIP_ROW) {
        skippedCount += 1;
        continue;
      }

      if (
        strategy === ImportDuplicateStrategy.UPDATE_EXISTING &&
        existingMember
      ) {
        updateRows.push({ row, memberId: existingMember.id });
        continue;
      }

      if (strategy === ImportDuplicateStrategy.CREATE_NEW) {
        if (existingMember?.phoneNumber === row.phoneNumber.trim()) {
          errors.push({
            row: rowNumber,
            message:
              'Cannot create a new member with a phone number that already exists',
          });
        } else {
          createRows.push(row);
        }
      }
    }

    if (errors.length > 0) {
      return { createdCount: 0, updatedCount: 0, skippedCount, errors };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const organizationCurrency = await this.organizationCurrency(
        organizationId,
        tx,
      );
      const createdMembers = await Promise.all(
        createRows.map((row) =>
          tx.member.create({
            data: this.memberCreateData(organizationId, row),
          }),
        ),
      );

      const updatedMembers = await Promise.all(
        updateRows.map(({ row, memberId }) =>
          tx.member.update({
            where: { id: memberId },
            data: {
              firstName: row.firstName.trim(),
              lastName: this.optionalTrim(row.lastName),
              phoneNumber: row.phoneNumber.trim(),
              email: this.optionalTrim(row.email),
              notes: this.optionalTrim(row.notes),
            },
          }),
        ),
      );
      const memberships = await this.createImportedMemberships(
        tx,
        organizationId,
        organizationCurrency,
        [
          ...createRows.map((row, index) => ({
            row,
            memberId: createdMembers[index].id,
          })),
          ...updateRows.map(({ row, memberId }) => ({ row, memberId })),
        ],
      );

      await tx.timelineEvent.createMany({
        data: [
          ...createdMembers.map((member) => ({
            organizationId,
            memberId: member.id,
            type: TimelineEventType.MEMBER_CREATED,
            metadata: { source: 'csv_import' },
          })),
          ...updatedMembers.map((member) => ({
            organizationId,
            memberId: member.id,
            type: TimelineEventType.MEMBER_UPDATED,
            metadata: { source: 'csv_import_duplicate_resolution' },
          })),
          ...memberships.map((membership) => ({
            organizationId,
            memberId: membership.memberId,
            type: TimelineEventType.MEMBERSHIP_CREATED,
            metadata: {
              membershipId: membership.membershipId,
              source: 'csv_import',
            },
          })),
        ],
      });

      return {
        createdCount: createdMembers.length,
        updatedCount: updatedMembers.length,
      };
    });

    return { ...result, skippedCount, errors: [] };
  }

  private async ensureUniquePhone(organizationId: string, phoneNumber: string) {
    const existing = await this.prisma.member.findFirst({
      where: { organizationId, phoneNumber, deletedAt: null },
    });

    if (existing) {
      throw new ConflictException(
        'A member with this phone number already exists',
      );
    }
  }

  private async organizationCurrency(
    organizationId: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { currency: true },
    });

    return organization?.currency ?? 'NGN';
  }

  private optionalTrim(value: string | undefined) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : undefined;
  }

  private async validateImportRows(
    organizationId: string,
    rows: ImportMemberRowDto[],
  ) {
    const firstPhoneRow = new Map<string, number>();
    const firstEmailRow = new Map<string, number>();
    const errors: Array<{ row: number; message: string }> = [];
    const errorRows: ImportReportRow[] = [];
    const warningRows: ImportReportRow[] = [];
    const validRows: ImportMemberRowDto[] = [];
    const candidateRows: ImportReportRow[] = [];
    const phones = new Set<string>();
    const emails = new Set<string>();

    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const phoneNumber = row.phoneNumber.trim();
      const email = this.optionalTrim(row.email)?.toLowerCase();
      const rowErrors: ImportIssue[] = [];

      if (firstPhoneRow.has(phoneNumber)) {
        rowErrors.push({
          row: rowNumber,
          message: 'Duplicate phone number in import file',
          field: 'phoneNumber',
          duplicateType: 'file',
        });
      } else {
        firstPhoneRow.set(phoneNumber, rowNumber);
      }

      if (email) {
        if (firstEmailRow.has(email)) {
          rowErrors.push({
            row: rowNumber,
            message: 'Duplicate email address in import file',
            field: 'email',
            duplicateType: 'file',
          });
        } else {
          firstEmailRow.set(email, rowNumber);
        }
      }

      if (rowErrors.length > 0) {
        errorRows.push({ row: rowNumber, data: row, issues: rowErrors });
        rowErrors.forEach((issue) =>
          errors.push({ row: issue.row, message: issue.message }),
        );
        return;
      }

      phones.add(phoneNumber);

      if (email) {
        emails.add(email);
      }

      candidateRows.push({
        row: rowNumber,
        data: { ...row, phoneNumber },
        issues: [],
      });
    });

    const existingMembers = await this.prisma.member.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { phoneNumber: { in: [...phones] } },
          { email: { in: [...emails] } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        email: true,
      },
    });
    const membersByPhone = new Map(
      existingMembers.map((member) => [member.phoneNumber, member]),
    );
    const membersByEmail = new Map(
      existingMembers
        .filter((member) => member.email)
        .map((member) => [member.email!.toLowerCase(), member]),
    );

    candidateRows.forEach((reportRow) => {
      const email = this.optionalTrim(reportRow.data.email)?.toLowerCase();
      const existingPhoneMember = membersByPhone.get(
        reportRow.data.phoneNumber,
      );
      const existingEmailMember = email ? membersByEmail.get(email) : undefined;

      if (existingPhoneMember) {
        reportRow.issues.push({
          row: reportRow.row,
          message: 'Phone number already exists for this organization',
          field: 'phoneNumber',
          duplicateType: 'existing',
          existingMember: existingPhoneMember,
        });
      }

      if (
        existingEmailMember &&
        existingEmailMember.id !== existingPhoneMember?.id
      ) {
        reportRow.issues.push({
          row: reportRow.row,
          message: 'Email address already exists for this organization',
          field: 'email',
          duplicateType: 'existing',
          existingMember: existingEmailMember,
        });
      }

      if (reportRow.issues.length > 0) {
        warningRows.push(reportRow);
      } else {
        validRows.push(reportRow.data);
      }
    });

    return { validRows, errors, errorRows, warningRows };
  }

  private memberCreateData(organizationId: string, row: ImportMemberRowDto) {
    return {
      organizationId,
      firstName: row.firstName.trim(),
      lastName: this.optionalTrim(row.lastName),
      phoneNumber: row.phoneNumber.trim(),
      email: this.optionalTrim(row.email),
      notes: this.optionalTrim(row.notes),
    };
  }

  private async createImportedMemberships(
    tx: Prisma.TransactionClient,
    organizationId: string,
    organizationCurrency: string,
    rows: Array<{ row: ImportMemberRowDto; memberId: string }>,
  ): Promise<ImportMembershipResult[]> {
    const results: ImportMembershipResult[] = [];

    for (const { row, memberId } of rows) {
      if (!row.expiryDate) {
        continue;
      }

      const planName = this.optionalTrim(row.planName);
      const amount = this.optionalTrim(row.membershipAmount);
      const plan = planName
        ? await this.findOrCreateImportPlan(
            tx,
            organizationId,
            planName,
            amount ?? '0',
            organizationCurrency,
          )
        : null;
      const expiryDate = new Date(row.expiryDate);
      const startDate = row.startDate
        ? new Date(row.startDate)
        : this.defaultMembershipStartDate(expiryDate);
      const membership = await tx.membership.create({
        data: {
          organizationId,
          memberId,
          planId: plan?.id,
          startDate,
          expiryDate,
          status: MembershipStatus.ACTIVE,
          amount: amount ?? plan?.amount ?? '0',
          currency: plan?.currency ?? organizationCurrency,
        },
      });

      results.push({ memberId, membershipId: membership.id });
    }

    return results;
  }

  private async findOrCreateImportPlan(
    tx: Prisma.TransactionClient,
    organizationId: string,
    name: string,
    amount: string,
    currency: string,
  ) {
    const existingPlan = await tx.plan.findFirst({
      where: { organizationId, name },
    });

    if (existingPlan) {
      return existingPlan;
    }

    return tx.plan.create({
      data: {
        organizationId,
        name,
        amount,
        currency,
      },
    });
  }

  private defaultMembershipStartDate(expiryDate: Date) {
    const startDate = new Date(expiryDate);
    startDate.setDate(startDate.getDate() - 30);
    return startDate;
  }
}
