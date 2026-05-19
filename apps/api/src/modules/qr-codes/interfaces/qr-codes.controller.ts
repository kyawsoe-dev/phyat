import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateQrCodeDto, UpdateQrCodeDto } from '../application/dto';
import { QrCodesService } from '../application/qr-codes.service';

@ApiTags('qr-codes')
@Controller('qr-codes')
export class QrCodesController {
  constructor(private readonly qrCodes: QrCodesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.qrCodes.list(user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: AuthenticatedUser, @Body() input: CreateQrCodeDto) {
    return this.qrCodes.create(user.id, input);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() input: UpdateQrCodeDto) {
    return this.qrCodes.update(user.id, id, input);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.qrCodes.archive(user.id, id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Download a QR code image' })
  download(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Res() response: Response) {
    return this.qrCodes.download(user.id, id, response);
  }

  @Get(':id/scan')
  @ApiOperation({ summary: 'Track a QR scan and redirect to the link destination' })
  scan(
    @Param('id') id: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('referer') referrer: string | undefined,
    @Req() req: Request,
    @Res() response: Response,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])?.trim() || undefined
      : req.ip || req.socket?.remoteAddress || undefined;
    return this.qrCodes.scan(id, { userAgent, referrer, ip: clientIp }, response);
  }
}
