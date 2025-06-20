import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { ITwoFactorService } from '../../application/services/ITwoFactorService';
import { v4 as uuidv4 } from 'uuid';

export class TwoFactorService implements ITwoFactorService {
  private readonly serviceName: string;

  constructor() {
    this.serviceName = process.env.APP_NAME || 'Forten CRM';
  }

  generateSecret(): string {
    const secret = speakeasy.generateSecret({
      name: this.serviceName,
      length: 32
    });

    return secret.base32;
  }

  async generateQRCode(email: string, secret: string): Promise<string> {
    const otpauthUrl = speakeasy.otpauthURL({
      secret,
      label: email,
      name: this.serviceName,
      issuer: this.serviceName,
      encoding: 'base32'
    });

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  verifyToken(secret: string, token: string): boolean {
    try {
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2 // Allow 2 time steps before/after current time
      });
    } catch (error) {
      return false;
    }
  }

  generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < 10; i++) {
      // Generate 8-character alphanumeric backup codes
      const code = this.generateRandomCode(8);
      codes.push(code);
    }
    
    return codes;
  }

  private generateRandomCode(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
      
      // Add hyphen after every 4 characters for readability
      if (i === 3 && length === 8) {
        result += '-';
      }
    }
    
    return result;
  }
}