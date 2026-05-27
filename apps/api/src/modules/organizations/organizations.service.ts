import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrganizationMembershipStatus,
  OrganizationRole,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { SetupOrganizationDto } from './dto/setup-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  async setup(userId: string, dto: SetupOrganizationDto) {
    const name = dto.name?.trim();

    if (!name) {
      throw new BadRequestException('Organization name is required');
    }

    const existingMembership =
      await this.prisma.organizationMembership.findFirst({
        where: {
          userId,
          status: OrganizationMembershipStatus.ACTIVE,
        },
        select: { id: true },
      });

    if (existingMembership) {
      throw new BadRequestException('Organization is already set up');
    }

    const organization = await this.prisma.$transaction(async (tx) => {
      const createdOrganization = await tx.organization.create({
        data: {
          name,
          slug: await this.createAvailableSlug(name),
          tagline: dto.tagline,
          description: dto.description,
          establishedYear: dto.establishedYear,
          businessType: dto.businessType,
          organizationSize: dto.organizationSize,
          websiteUrl: dto.websiteUrl,
          contactEmail: dto.contactEmail,
          primaryPhone: dto.primaryPhone,
          secondaryPhone: dto.secondaryPhone,
          addressLine: dto.addressLine,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country,
          timezone: dto.timezone,
          dateFormat: dto.dateFormat,
          timeFormat: dto.timeFormat,
          currency: dto.currency,
          businessHours: dto.businessHours as Prisma.InputJsonValue | undefined,
          closedOnPublicHolidays: dto.closedOnPublicHolidays,
          logoUrl: dto.logoUrl,
          imageUrls: dto.imageUrls,
        },
      });

      await tx.organizationMembership.create({
        data: {
          organizationId: createdOrganization.id,
          userId,
          role: OrganizationRole.OWNER,
          status: OrganizationMembershipStatus.ACTIVE,
          acceptedAt: new Date(),
        },
      });

      return createdOrganization;
    });

    return this.getCurrent(organization.id);
  }

  async getCurrent(organizationId: string) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);

    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: this.organizationSelect,
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateCurrent(organizationId: string, dto: UpdateOrganizationDto) {
    this.tenantPrisma.assertOrganizationAccess(organizationId);
    const current = await this.getCurrent(organizationId);
    const name = dto.name?.trim();
    const data = this.compactOrganizationData(dto);

    if (name && name !== current.name) {
      data.name = name;
      data.slug = await this.createAvailableSlug(name, organizationId);
    }

    if (Object.keys(data).length === 0) {
      return current;
    }

    await this.prisma.organization.update({
      where: { id: organizationId },
      data,
    });

    return this.getCurrent(organizationId);
  }

  private compactOrganizationData(dto: UpdateOrganizationDto) {
    return Object.fromEntries(
      Object.entries(this.organizationData(dto)).filter(
        ([, value]) => value !== undefined,
      ),
    ) as Prisma.OrganizationUpdateInput;
  }

  private organizationData(dto: UpdateOrganizationDto) {
    return {
      tagline: dto.tagline,
      description: dto.description,
      establishedYear: dto.establishedYear,
      businessType: dto.businessType,
      organizationSize: dto.organizationSize,
      websiteUrl: dto.websiteUrl,
      contactEmail: dto.contactEmail,
      primaryPhone: dto.primaryPhone,
      secondaryPhone: dto.secondaryPhone,
      addressLine: dto.addressLine,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      timezone: dto.timezone,
      dateFormat: dto.dateFormat,
      timeFormat: dto.timeFormat,
      currency: dto.currency,
      businessHours: dto.businessHours as Prisma.InputJsonValue | undefined,
      closedOnPublicHolidays: dto.closedOnPublicHolidays,
      logoUrl: dto.logoUrl,
      imageUrls: dto.imageUrls,
    } satisfies Prisma.OrganizationUpdateInput;
  }

  private get organizationSelect() {
    return {
      id: true,
      name: true,
      slug: true,
      tagline: true,
      description: true,
      establishedYear: true,
      businessType: true,
      organizationSize: true,
      websiteUrl: true,
      contactEmail: true,
      primaryPhone: true,
      secondaryPhone: true,
      addressLine: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      timezone: true,
      dateFormat: true,
      timeFormat: true,
      currency: true,
      businessHours: true,
      closedOnPublicHolidays: true,
      logoUrl: true,
      imageUrls: true,
      createdAt: true,
      updatedAt: true,
    } satisfies Prisma.OrganizationSelect;
  }

  private async createAvailableSlug(name: string, organizationId?: string) {
    const baseSlug = this.slugify(name);

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const existing = await this.prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing || existing.id === organizationId) {
        return slug;
      }
    }

    return `${baseSlug}-${randomBytes(4).toString('hex')}`;
  }

  private slugify(value: string) {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'organization';
  }
}
