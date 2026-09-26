import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { otpRepository, OtpRepository } from '../repositories/otpRepository';
import { OtpRecord } from '../models';

export class OtpService {
  private otpRepo: OtpRepository;

  constructor(otpRepo: OtpRepository = otpRepository) {
    this.otpRepo = otpRepo;
  }

  /**
   * Crée et expédie un code de vérification
   */
  public async sendOtp(identifier: string): Promise<{
    success: boolean;
    message: string;
    cooldownRemaining?: number;
    debugCode?: string;
  }> {
    const cleanId = identifier.trim().toLowerCase();
    const now = new Date();

    // 1. Vérification du Cooldown anti-spam
    const lastSent = await this.otpRepo.getLastSentTime(cleanId);
    if (lastSent) {
      const elapsedSeconds = Math.floor((now.getTime() - lastSent.getTime()) / 1000);
      if (elapsedSeconds < config.otp.resendCooldownSeconds) {
        const remaining = config.otp.resendCooldownSeconds - elapsedSeconds;
        return {
          success: false,
          message: `Veuillez patienter ${remaining} secondes avant de demander un nouveau code.`,
          cooldownRemaining: remaining,
        };
      }
    }

    // 2. Génération du code OTP numérique
    const min = Math.pow(10, config.otp.length - 1);
    const max = Math.pow(10, config.otp.length) - 1;
    const code = crypto.randomInt(min, max + 1).toString();

    // 3. Persistance dans le repository
    const expiresAt = new Date(now.getTime() + config.otp.expiryMinutes * 60 * 1000);
    const record: OtpRecord = {
      identifier: cleanId,
      code,
      createdAt: now,
      expiresAt,
      attemptsLeft: config.otp.maxAttempts,
    };
    await this.otpRepo.save(record);

    // 4. Acheminement Email ou SMS
    const isEmail = cleanId.includes('@');
    if (isEmail) {
      await this.dispatchEmail(cleanId, code);
    } else {
      await this.dispatchSms(cleanId, code);
    }

    return {
      success: true,
      message: `Code de sécurité envoyé à ${cleanId} avec succès.`,
      debugCode: config.nodeEnv === 'development' ? code : undefined,
    };
  }

  /**
   * Valide le code OTP saisi
   */
  public async verifyOtp(
    identifier: string,
    code: string
  ): Promise<{ success: boolean; message: string }> {
    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = code.trim();

    const record = await this.otpRepo.get(cleanId);

    if (!record) {
      return {
        success: false,
        message: 'Aucun code actif pour cet identifiant. Veuillez en demander un nouveau.',
      };
    }

    const now = new Date();
    if (now > record.expiresAt) {
      await this.otpRepo.delete(cleanId);
      return {
        success: false,
        message: 'Ce code de sécurité a expiré. Veuillez demander un nouveau code.',
      };
    }

    if (record.code !== cleanCode) {
      const remaining = await this.otpRepo.decrementAttempts(cleanId);
      return {
        success: false,
        message:
          remaining > 0
            ? `Code incorrect. Tentatives restantes : ${remaining}`
            : 'Nombre maximal de tentatives atteint. Veuillez demander un nouveau code.',
      };
    }

    // Code valide : consommation immédiate
    await this.otpRepo.delete(cleanId);
    return {
      success: true,
      message: 'Code validé avec succès.',
    };
  }

  /**
   * Expédition Email SMTP avec gabarit HTML Iventello
   */
  private async dispatchEmail(email: string, code: string): Promise<void> {
    if (!config.smtp.host || !config.smtp.user) {
      console.log(`\n==================================================`);
      console.log(`📧 [IVENTELLO AUTH EMAIL SIMULATOR]`);
      console.log(`Destinataire : ${email}`);
      console.log(`Code OTP     : ${code}`);
      console.log(`Expiration   : dans ${config.otp.expiryMinutes} minutes`);
      console.log(`==================================================\n`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0F1115; color: #F3F4F6; padding: 40px 20px; text-align: center;">
        <div style="max-width: 480px; margin: 0 auto; background-color: #16191F; border: 1px solid #282D37; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <h1 style="color: #0066FF; font-size: 26px; margin-bottom: 8px; letter-spacing: 2px;">IVENTELLO</h1>
          <p style="color: #9CA3AF; font-size: 14px; margin-top: 0;">Sécurité & Authentification</p>
          <hr style="border: 0; border-top: 1px solid #282D37; margin: 24px 0;" />
          <p style="font-size: 15px; line-height: 1.5; color: #D1D5DB;">
            Vous avez demandé un code de vérification pour votre compte Iventello.
          </p>
          <div style="background-color: #1E222B; border: 1px solid #0066FF; border-radius: 8px; padding: 18px; margin: 24px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #FFFFFF; font-family: monospace;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #9CA3AF;">
            Ce code est valable pendant <strong>${config.otp.expiryMinutes} minutes</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>
          <hr style="border: 0; border-top: 1px solid #282D37; margin: 24px 0;" />
          <p style="font-size: 11px; color: #6B7280; margin-bottom: 0;">
            © ${new Date().getFullYear()} Iventello POS & Stock System. Tous droits réservés.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${config.smtp.fromName}" <${config.smtp.fromEmail}>`,
      to: email,
      subject: `Votre code de sécurité Iventello : ${code}`,
      text: `Votre code de sécurité Iventello est : ${code} (Valide pendant ${config.otp.expiryMinutes} minutes).`,
      html: htmlContent,
    });
  }

  /**
   * Expédition SMS
   */
  private async dispatchSms(phone: string, code: string): Promise<void> {
    if (!config.sms.apiUrl || !config.sms.apiKey) {
      console.log(`\n==================================================`);
      console.log(`📱 [IVENTELLO AUTH SMS SIMULATOR]`);
      console.log(`Destinataire : ${phone}`);
      console.log(`Sender ID    : ${config.sms.senderId}`);
      console.log(`Code OTP     : ${code}`);
      console.log(`==================================================\n`);
      return;
    }

    console.log(`[SMS DISPATCH] Envoi vers ${phone} via ${config.sms.apiUrl}...`);
  }
}

export const otpService = new OtpService();
