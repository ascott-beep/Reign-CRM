import "server-only";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.MAILBOX_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("MAILBOX_TOKEN_ENCRYPTION_KEY is not set, mailbox connections are not configured yet.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("MAILBOX_TOKEN_ENCRYPTION_KEY must decode to 32 bytes, generate with: openssl rand -base64 32");
  return key;
}

/** Section 7 "Store tokens encrypted" — AES-256-GCM, one key for the whole workspace's mailbox tokens. */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptToken(stored: string): string {
  const [ivB64, authTagB64, ciphertextB64] = stored.split(".");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Malformed encrypted token.");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
