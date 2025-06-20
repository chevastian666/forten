import nodemailer from 'nodemailer';
import { IEmailService } from '../../application/services/IEmailService';

export class EmailService implements IEmailService {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;

  constructor() {
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@forten-crm.com';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
    const verificationUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Verify Your Email - Forten CRM',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Forten CRM!</h1>
            <p style="color: #666; font-size: 16px;">Hi ${firstName},</p>
            <p style="color: #666; font-size: 16px;">Thank you for signing up for Forten CRM. To complete your registration, please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
            </div>
            <p style="color: #666; font-size: 14px;">If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="color: #007bff; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours for security reasons.</p>
            <p style="color: #666; font-size: 14px;">If you didn't create an account with us, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Forten CRM. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, firstName: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Reset Your Password - Forten CRM',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Password Reset Request</h1>
            <p style="color: #666; font-size: 16px;">Hi ${firstName},</p>
            <p style="color: #666; font-size: 16px;">We received a request to reset your password for your Forten CRM account. Click the button below to choose a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">If the button doesn't work, you can also copy and paste this link into your browser:</p>
            <p style="color: #dc3545; font-size: 14px; word-break: break-all;">${resetUrl}</p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour for security reasons.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Forten CRM. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Welcome to Forten CRM!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to Forten CRM</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Welcome to Forten CRM!</h1>
            <p style="color: #666; font-size: 16px;">Hi ${firstName},</p>
            <p style="color: #666; font-size: 16px;">Congratulations! Your email has been verified and your Forten CRM account is now active.</p>
            <p style="color: #666; font-size: 16px;">You can now access all features of our CRM platform:</p>
            <ul style="color: #666; font-size: 16px; padding-left: 20px;">
              <li>Manage your contacts and leads</li>
              <li>Track sales opportunities</li>
              <li>Generate reports and analytics</li>
              <li>Collaborate with your team</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.frontendUrl}/dashboard" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
            </div>
            <p style="color: #666; font-size: 14px;">If you have any questions or need assistance, feel free to contact our support team.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Forten CRM. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendTwoFactorDisabledEmail(email: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Two-Factor Authentication Disabled - Forten CRM',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Two-Factor Authentication Disabled</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #333; text-align: center; margin-bottom: 30px;">Security Alert</h1>
            <p style="color: #666; font-size: 16px;">Hi ${firstName},</p>
            <p style="color: #666; font-size: 16px;">Two-factor authentication has been disabled for your Forten CRM account.</p>
            <p style="color: #666; font-size: 16px;">If you did not make this change, please contact our support team immediately and consider:</p>
            <ul style="color: #666; font-size: 16px; padding-left: 20px;">
              <li>Changing your password</li>
              <li>Re-enabling two-factor authentication</li>
              <li>Reviewing your recent account activity</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.frontendUrl}/settings/security" style="background-color: #ffc107; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Security Settings</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Forten CRM. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendSuspiciousActivityEmail(email: string, firstName: string, ipAddress: string): Promise<void> {
    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: 'Suspicious Activity Detected - Forten CRM',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Suspicious Activity Detected</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #dc3545; text-align: center; margin-bottom: 30px;">Security Alert</h1>
            <p style="color: #666; font-size: 16px;">Hi ${firstName},</p>
            <p style="color: #666; font-size: 16px;">We detected suspicious activity on your Forten CRM account:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #666;"><strong>IP Address:</strong> ${ipAddress}</p>
              <p style="margin: 10px 0 0 0; color: #666;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #666; font-size: 16px;">If this was you, you can ignore this email. If not, please take immediate action:</p>
            <ul style="color: #666; font-size: 16px; padding-left: 20px;">
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication</li>
              <li>Review your recent account activity</li>
              <li>Contact our support team</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.frontendUrl}/settings/security" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Secure My Account</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Forten CRM. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    await this.transporter.sendMail(mailOptions);
  }
}