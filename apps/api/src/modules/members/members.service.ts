import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MemberStatus,
  MembershipStatus,
  TimelineEventType,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { ImportMembersDto, ImportMemberRowDto } from './dto/import-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

type ListMembersQuery = {
  search?: string;
  status?: MemberStatus;
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
            currency: plan?.currency ?? 'NGN',
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
    const { validRows, errors } = await this.validateImportRows(
      organizationId,
      dto.rows,
    );

    if (errors.length > 0) {
      return { createdCount: 0, errors };
    }

    const createdMembers = await this.prisma.$transaction(
      validRows.map((row) =>
        this.prisma.member.create({
          data: {
            organizationId,
            firstName: row.firstName.trim(),
            lastName: this.optionalTrim(row.lastName),
            phoneNumber: row.phoneNumber.trim(),
            email: this.optionalTrim(row.email),
            notes: this.optionalTrim(row.notes),
          },
        }),
      ),
    );

    await this.prisma.timelineEvent.createMany({
      data: createdMembers.map((member) => ({
        organizationId,
        memberId: member.id,
        type: TimelineEventType.MEMBER_CREATED,
        metadata: { source: 'csv_import' },
      })),
    });

    return { createdCount: createdMembers.length, errors: [] };
  }

  async dryRunImport(organizationId: string, dto: ImportMembersDto) {
    const { validRows, errors, warnings } = await this.validateImportRows(
      organizationId,
      dto.rows,
    );

    return {
      validRows,
      warningRows: warnings,
      errorRows: errors,
    };
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

  private optionalTrim(value: string | undefined) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : undefined;
  }

  private async validateImportRows(
    organizationId: string,
    rows: ImportMemberRowDto[],
  ) {
    const seenPhones = new Set<string>();
    const errors: Array<{ row: number; message: string }> = [];
    const warnings: Array<{ row: number; message: string }> = [];
    const validRows: ImportMemberRowDto[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const phoneNumber = row.phoneNumber.trim();

      if (seenPhones.has(phoneNumber)) {
        errors.push({
          row: rowNumber,
          message: 'Duplicate phone number in import file',
        });
        return;
      }

      seenPhones.add(phoneNumber);
      validRows.push({ ...row, phoneNumber });
    });

    const existingMembers = await this.prisma.member.findMany({
      where: {
        organizationId,
        deletedAt: null,
        phoneNumber: { in: [...seenPhones] },
      },
      select: { phoneNumber: true },
    });
    const existingPhones = new Set(
      existingMembers.map((member) => member.phoneNumber),
    );

    validRows.forEach((row, index) => {
      if (existingPhones.has(row.phoneNumber)) {
        const duplicate = {
          row: index + 1,
          message: 'Phone number already exists for this organization',
        };
        errors.push(duplicate);
        warnings.push(duplicate);
      }
    });

    return { validRows, errors, warnings };
  }
}
