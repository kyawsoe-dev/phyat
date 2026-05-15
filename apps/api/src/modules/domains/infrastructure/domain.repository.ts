import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { CreateDomainDto } from '../application/dto';
import * as crypto from 'crypto';

@Injectable()
export class DomainRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateDomainDto) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    return this.prisma.domain.create({
      data: {
        userId,
        domain: input.domain,
        verificationToken,
      },
    });
  }

  listByUser(userId: string) {
    return this.prisma.domain.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { links: true } },
      },
    });
  }

  findById(id: string, userId: string) {
    return this.prisma.domain.findFirst({ where: { id, userId } });
  }

  findByDomain(domain: string) {
    return this.prisma.domain.findUnique({ where: { domain } });
  }

  async verify(id: string, userId: string) {
    return this.prisma.domain.updateMany({
      where: { id, userId },
      data: { verified: true },
    });
  }

  async setDefault(id: string, userId: string) {
    await this.prisma.domain.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
    return this.prisma.domain.updateMany({
      where: { id, userId },
      data: { isDefault: true },
    });
  }

  async removeDefault(userId: string) {
    return this.prisma.domain.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async delete(id: string, userId: string) {
    await this.prisma.link.updateMany({
      where: { domainId: id, userId },
      data: { domainId: null },
    });
    return this.prisma.domain.deleteMany({ where: { id, userId } });
  }

  async getDefaultDomain(userId: string) {
    return this.prisma.domain.findFirst({
      where: { userId, verified: true, isDefault: true },
    });
  }
}
