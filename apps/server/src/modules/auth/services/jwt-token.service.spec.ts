import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ConfigService } from "@rishi/config";
import { JwtTokenService } from "./jwt-token.service.js";

function createConfig(privateKey: string, publicKey: string): ConfigService {
  return new ConfigService({
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/rishi_test",
    AES_MASTER_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    JWT_PRIVATE_KEY: privateKey,
    JWT_PUBLIC_KEY: publicKey,
  });
}

describe("JwtTokenService", () => {
  const keys = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  it("signs and verifies RS256 access tokens", async () => {
    const service = new JwtTokenService(createConfig(keys.privateKey, keys.publicKey));
    const token = await service.signToken({
      sub: "user-1",
      email: "user@example.com",
      role: "user",
    });

    await expect(service.verifyToken(token)).resolves.toMatchObject({
      sub: "user-1",
      email: "user@example.com",
      role: "user",
    });
  });

  it("accepts base64-encoded PEM configuration", async () => {
    const service = new JwtTokenService(
      createConfig(
        Buffer.from(keys.privateKey).toString("base64"),
        Buffer.from(keys.publicKey).toString("base64")
      )
    );
    const token = await service.signToken({ sub: "user-1" });
    await expect(service.verifyToken(token)).resolves.toMatchObject({ sub: "user-1" });
  });

  it("rejects tokens signed by another key", async () => {
    const otherKeys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    const signer = new JwtTokenService(createConfig(otherKeys.privateKey, otherKeys.publicKey));
    const verifier = new JwtTokenService(createConfig(keys.privateKey, keys.publicKey));
    await expect(verifier.verifyToken(await signer.signToken({ sub: "user-1" }))).rejects.toThrow();
  });

  it("fails fast when configured keys do not form a pair", () => {
    const otherKeys = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    expect(() => new JwtTokenService(createConfig(keys.privateKey, otherKeys.publicKey))).toThrow(
      "mismatched key pair"
    );
  });
});
