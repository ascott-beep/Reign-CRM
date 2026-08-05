import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * File storage provider abstraction (spec 2 / 6.21). `local` writes to disk
 * under STORAGE_LOCAL_DIR for development; `s3` is a documented interface
 * for an S3-compatible bucket in production. Storage credentials never
 * reach the browser — uploads go through server actions/route handlers,
 * and downloads are streamed back through a server route rather than
 * exposing signed URLs to the client (kept simple for this build).
 */

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
]);

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export function validateFile(file: { type: string; size: number }) {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`File type "${file.type}" is not allowed.`);
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds the 25MB upload limit.");
  }
}

interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;
  constructor() {
    this.baseDir = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? "./storage");
  }
  private resolve(key: string) {
    const resolved = path.resolve(this.baseDir, key);
    if (!resolved.startsWith(this.baseDir)) throw new Error("Invalid storage key.");
    return resolved;
  }
  async put(key: string, data: Buffer) {
    const filePath = this.resolve(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }
  async get(key: string) {
    return readFile(this.resolve(key));
  }
  async delete(key: string) {
    await unlink(this.resolve(key)).catch(() => {});
  }
}

/**
 * S3-compatible provider. Requires S3_BUCKET / S3_ACCESS_KEY_ID /
 * S3_SECRET_ACCESS_KEY (see .env.example); S3_ENDPOINT and S3_REGION are
 * optional overrides for non-AWS providers (e.g. Cloudflare R2, which uses
 * an account-specific endpoint and region "auto").
 */
class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3 storage provider is not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY (and S3_ENDPOINT for non-AWS providers).",
      );
    }
    this.bucket = bucket;
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async put(key: string, data: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }));
  }

  async get(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error("Object has no body.");
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

function getProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
}

export function generateStorageKey(originalFilename: string) {
  const ext = path.extname(originalFilename);
  const safeBase = randomUUID();
  return `${safeBase}${ext}`;
}

export async function storeFile(key: string, data: Buffer, contentType: string) {
  await getProvider().put(key, data, contentType);
}

export async function readFileFromStorage(key: string) {
  return getProvider().get(key);
}

export async function deleteFileFromStorage(key: string) {
  await getProvider().delete(key);
}
