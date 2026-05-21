import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserInvoices(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });
  }

  async getAllInvoices(page: number, limit: number, search?: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.user = { email: { contains: search, mode: 'insensitive' } };
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createInvoice(userId: string, amount: number, description?: string) {
    return this.prisma.invoice.create({
      data: { userId, amount, description },
    });
  }

  async updateInvoice(id: string, data: { amount?: number; status?: string; paidAt?: string | null }) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found.');

    const updateData: Record<string, unknown> = {};
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.paidAt !== undefined) updateData.paidAt = data.paidAt ? new Date(data.paidAt) : null;

    return this.prisma.invoice.update({ where: { id }, data: updateData });
  }

  async deleteInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    await this.prisma.invoice.delete({ where: { id } });
    return { success: true };
  }
}
