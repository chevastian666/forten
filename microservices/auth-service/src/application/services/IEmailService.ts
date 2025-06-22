export interface IEmailService {
  sendVerificationEmail(email: string, firstName: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void>;
  sendWelcomeEmail(email: string, firstName: string): Promise<void>;
  sendTwoFactorDisabledEmail(email: string, firstName: string): Promise<void>;
  sendSuspiciousActivityEmail(email: string, firstName: string, ipAddress: string): Promise<void>;
}