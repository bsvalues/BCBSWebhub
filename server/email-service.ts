import { createTransport, Transporter } from 'nodemailer';
import { User } from '@shared/schema';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailService {
  private transporter!: Transporter;
  private fromAddress!: string;
  private isEnabled: boolean = false;

  constructor() {
    // Default configuration - can be overridden in setup
    const defaultConfig: EmailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.office365.com', // Default to Exchange Online
      port: parseInt(process.env.EMAIL_PORT || '587'), // Standard secure SMTP port
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || 'notifications@bentoncounty.gov',
        pass: process.env.EMAIL_PASSWORD || '',
      },
      from: process.env.EMAIL_FROM || 'County Audit Hub <no-reply@bentoncounty.gov>',
    };

    // Only initialize if we have credentials
    if (process.env.EMAIL_PASSWORD) {
      try {
        this.transporter = createTransport({
          host: defaultConfig.host,
          port: defaultConfig.port,
          secure: defaultConfig.secure,
          auth: {
            user: defaultConfig.auth.user,
            pass: defaultConfig.auth.pass,
          },
        });
        this.fromAddress = defaultConfig.from;
        this.isEnabled = true;
        console.log('Email service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize email service:', error);
        this.isEnabled = false;
      }
    } else {
      console.log('Email service disabled: No credentials provided');
      this.isEnabled = false;
    }
  }

  /**
   * Sends a welcome email to a newly registered user
   */
  async sendWelcomeEmail(user: User, temporaryPassword?: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('Email service disabled, skipping welcome email');
      return false;
    }

    try {
      // Email content with Benton County branding
      const subject = 'Welcome to Benton County Audit Hub';
      
      // Plain text version
      const text = `
Hello ${user.fullName},

Welcome to the Benton County Audit Hub. Your account has been successfully created.

Username: ${user.username}
${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}

${temporaryPassword ? 'Please log in and change your password as soon as possible for security reasons.' : ''}

This system is for authorized Benton County personnel only. Unauthorized access is prohibited.

Thank you,
Benton County Assessor's Office
      `;
      
      // HTML version with some basic styling
      const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #004b87; padding: 20px; color: white; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .footer { font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
    .important { color: #d9534f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Benton County Audit Hub</h2>
    </div>
    <div class="content">
      <p>Hello ${user.fullName},</p>
      
      <p>Welcome to the Benton County Audit Hub. Your account has been successfully created.</p>
      
      <p><strong>Username:</strong> ${user.username}</p>
      ${temporaryPassword ? `<p><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : ''}
      
      ${temporaryPassword ? '<p class="important">Please log in and change your password as soon as possible for security reasons.</p>' : ''}
      
      <p>This system is for authorized Benton County personnel only. Unauthorized access is prohibited.</p>
    </div>
    <div class="footer">
      <p>Thank you,<br>Benton County Assessor's Office</p>
    </div>
  </div>
</body>
</html>
      `;
      
      const result = await this.transporter.sendMail({
        from: this.fromAddress,
        to: `${user.fullName} <${user.username}@bentoncounty.gov>`, // Assuming county email based on username
        subject,
        text,
        html,
      });
      
      console.log('Welcome email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  /**
   * Sends a password reset email with a temporary password
   */
  async sendPasswordResetEmail(user: User, temporaryPassword: string): Promise<boolean> {
    if (!this.isEnabled) {
      console.log('Email service disabled, skipping password reset email');
      return false;
    }

    try {
      // Email content with Benton County branding
      const subject = 'Benton County Audit Hub - Password Reset';
      
      // Plain text version
      const text = `
Hello ${user.fullName},

Your password for the Benton County Audit Hub has been reset.

Username: ${user.username}
Temporary Password: ${temporaryPassword}

Please log in and change your password as soon as possible for security reasons.

If you did not request this password reset, please contact the IT department immediately.

Thank you,
Benton County Assessor's Office
      `;
      
      // HTML version with some basic styling
      const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #004b87; padding: 20px; color: white; }
    .content { padding: 20px; border: 1px solid #ddd; }
    .footer { font-size: 12px; color: #666; margin-top: 20px; border-top: 1px solid #ddd; padding-top: 20px; }
    .important { color: #d9534f; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Benton County Audit Hub</h2>
    </div>
    <div class="content">
      <p>Hello ${user.fullName},</p>
      
      <p>Your password for the Benton County Audit Hub has been reset.</p>
      
      <p><strong>Username:</strong> ${user.username}</p>
      <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
      
      <p class="important">Please log in and change your password as soon as possible for security reasons.</p>
      
      <p class="important">If you did not request this password reset, please contact the IT department immediately.</p>
    </div>
    <div class="footer">
      <p>Thank you,<br>Benton County Assessor's Office</p>
    </div>
  </div>
</body>
</html>
      `;
      
      const result = await this.transporter.sendMail({
        from: this.fromAddress,
        to: `${user.fullName} <${user.username}@bentoncounty.gov>`, // Assuming county email based on username
        subject,
        text,
        html,
      });
      
      console.log('Password reset email sent:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  /**
   * Utility function to generate a temporary password
   */
  generateTemporaryPassword(length = 10): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const allChars = uppercase + lowercase + numbers;
    
    let password = '';
    
    // Ensure at least one of each character type
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    
    // Fill the rest randomly
    for (let i = 3; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * allChars.length);
      password += allChars.charAt(randomIndex);
    }
    
    // Shuffle the password characters
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }
}

// Singleton instance
export const emailService = new EmailService();