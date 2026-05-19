import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateCurrent(organizationId: string, dto: UpdateOrganizationDto) {
    const current = await this.getCurrent(organizationId);
    const name = dto.name?.trim();

    if (!name || name === current.name) {
      return current;
    }

    const slug = await this.createAvailableSlug(name, organizationId);

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { name, slug },
    });

    return this.getCurrent(organizationId);
  }

  private async createAvailableSlug(name: string, organizationId: string) {
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
