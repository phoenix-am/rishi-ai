import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@rishi/config";
import type { IEmailProvider } from "@rishi/auth";
import nodemailer, { type Transporter } from "nodemailer";

export class DisabledEmailProvider implements IEmailProvider {
  public async sendOtp(): Promise<void> {
    throw new ServiceUnavailableException("Passwordless email delivery is not configured.");
  }
}

export class SmtpEmailProvider implements IEmailProvider {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const user = config.get("SMTP_USER");
    const password = config.get("SMTP_PASSWORD");
    const secure = config.get("SMTP_SECURE");
    this.from = config.get("SMTP_FROM")!;
    this.transporter = nodemailer.createTransport({
      host: config.get("SMTP_HOST"),
      port: config.get("SMTP_PORT"),
      secure,
      requireTLS: config.get("NODE_ENV") === "production" && !secure,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
      auth: user && password ? { user, pass: password } : undefined,
    });
  }

  public async sendOtp(email: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: "Your Rishi AI verification code",
      text: `Your Rishi AI verification code is ${code}. It expires in 5 minutes.`,
    });
  }
}

export function createEmailProvider(config: ConfigService): IEmailProvider {
  return config.get("EMAIL_PROVIDER") === "smtp"
    ? new SmtpEmailProvider(config)
    : new DisabledEmailProvider();
}
