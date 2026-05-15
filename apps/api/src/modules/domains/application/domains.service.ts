import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDomainDto, UpdateDomainDto } from './dto';
import { DomainRepository } from '../infrastructure/domain.repository';
import * as dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

@Injectable()
export class DomainsService {
  private readonly VERIFICATION_PREFIX = 'phyat-verify=';

  constructor(private readonly domains: DomainRepository) {}

  async create(userId: string, input: CreateDomainDto) {
    const existing = await this.domains.findByDomain(input.domain);
    if (existing) {
      if (existing.userId === userId) {
        throw new ConflictException('Domain already added.');
      }
      throw new ConflictException('Domain is already in use.');
    }
    return this.domains.create(userId, input);
  }

  list(userId: string) {
    return this.domains.listByUser(userId);
  }

  async verify(userId: string, id: string) {
    const domain = await this.domains.findById(id, userId);
    if (!domain) throw new NotFoundException('Domain not found.');

    let records: string[][] = [];
    try {
      records = await resolveTxt(domain.domain);
    } catch {
      throw new ConflictException(
        `Could not query DNS TXT records for ${domain.domain}. ` +
          'Ensure the domain has a TXT record and DNS has propagated.',
      );
    }

    const expected = `${this.VERIFICATION_PREFIX}${domain.verificationToken}`;
    const found = records.some((record) =>
      record.some((value) => value.includes(expected)),
    );

    if (!found) {
      throw new ConflictException(
        `Verification failed. Add this TXT record to your domain's DNS: "${expected}"`,
      );
    }

    await this.domains.verify(id, userId);
    return { verified: true };
  }

  async setDefault(userId: string, id: string) {
    const domain = await this.domains.findById(id, userId);
    if (!domain) throw new NotFoundException('Domain not found.');
    if (!domain.verified) throw new ConflictException('Domain must be verified before setting as default.');
    return this.domains.setDefault(id, userId);
  }

  async removeDefault(userId: string) {
    return this.domains.removeDefault(userId);
  }

  async remove(userId: string, id: string) {
    const domain = await this.domains.findById(id, userId);
    if (!domain) throw new NotFoundException('Domain not found.');
    return this.domains.delete(id, userId);
  }
}
