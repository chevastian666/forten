export interface ITwoFactorService {
  generateSecret(): string;
  generateQRCode(email: string, secret: string): Promise<string>;
  verifyToken(secret: string, token: string): boolean;
  generateBackupCodes(): string[];
}