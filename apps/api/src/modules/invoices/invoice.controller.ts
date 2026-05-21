import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../../common/auth/admin.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { InvoiceService } from './invoice.service';

@ApiTags('invoices')
@Controller()
export class InvoiceController {
  constructor(private readonly invoice: InvoiceService) {}

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user invoices' })
  getMyInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.invoice.getUserInvoices(user.id);
  }

  @Get('admin/invoices')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Get all invoices' })
  getAllInvoices(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.invoice.getAllInvoices(Number(page), Number(limit), search, status);
  }

  @Post('admin/invoices')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Create an invoice for a user' })
  createInvoice(@Body() body: { userId: string; amount: number; description?: string }) {
    return this.invoice.createInvoice(body.userId, body.amount, body.description);
  }

  @Put('admin/invoices/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Update an invoice' })
  updateInvoice(
    @Param('id') id: string,
    @Body() body: { amount?: number; status?: string; paidAt?: string | null },
  ) {
    return this.invoice.updateInvoice(id, body);
  }

  @Delete('admin/invoices/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete/void an invoice' })
  deleteInvoice(@Param('id') id: string) {
    return this.invoice.deleteInvoice(id);
  }
}
