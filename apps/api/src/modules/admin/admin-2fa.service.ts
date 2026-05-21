import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';

export type Admin2faSetupData = {
  secret: string;
  otpauthUrl: string;
  qrCode: string;
};

@Injectable()
export class Admin2faService {
  generateSecret(email: string): Admin2faSetupData {
    const secret = speakeasy.generateSecret({
      name: `Phyat Admin (${email})`,
      issuer: 'Phyat',
      length: 20,
      otpauth_url: true,
    } as speakeasy.GenerateSecretWithOtpAuthUrlOptions);

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCode: secret.otpauth_url,
    };
  }

  verifyToken(token: string, secret: string): boolean {
    const normalizedToken = token.replace(/\D/g, '').slice(0, 6);

    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: normalizedToken,
      window: 2,
    });
  }

  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 8; i++) {
      const code = Array.from({ length: 4 }, () =>
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)],
      ).join('');
      codes.push(code);
    }
    return codes;
  }
}
