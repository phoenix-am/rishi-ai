import { describe, expect, it, vi } from "vitest";
import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@rishi/config";

const mailMocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: mailMocks.createTransport },
}));

import {
  DisabledEmailProvider,
  SmtpEmailProvider,
  createEmailProvider,
} from "./email.providers.js";

function config(overrides: Record<string, unknown> = {}): ConfigService {
  return new ConfigService({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_test",
    AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    JWT_PRIVATE_KEY: "test-private-key",
    JWT_PUBLIC_KEY: "test-public-key",
    ...overrides,
  });
}

describe("Email providers", () => {
  it("fails closed when delivery is disabled", async () => {
    await expect(new DisabledEmailProvider().sendOtp()).rejects.toBeInstanceOf(
      ServiceUnavailableException
    );
  });

  it("sends OTP email through the configured SMTP transport", async () => {
    mailMocks.sendMail.mockResolvedValueOnce(undefined);
    mailMocks.createTransport.mockReturnValueOnce({ sendMail: mailMocks.sendMail });
    const provider = createEmailProvider(
      config({
        NODE_ENV: "production",
        EMAIL_PROVIDER: "smtp",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_USER: "mailer",
        SMTP_PASSWORD: "test-password",
        SMTP_FROM: "no-reply@example.com",
      })
    );

    expect(provider).toBeInstanceOf(SmtpEmailProvider);
    expect(mailMocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        requireTLS: true,
      })
    );
    await provider.sendOtp("user@example.com", "123456");
    expect(mailMocks.sendMail).toHaveBeenCalledWith({
      from: "no-reply@example.com",
      to: "user@example.com",
      subject: "Your Rishi AI verification code",
      text: expect.stringContaining("123456"),
    });
  });
});
