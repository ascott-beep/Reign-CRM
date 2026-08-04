import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";

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
 * S3-compatible provider. Requires S3_BUCKET / S3_REGION / S3_ACCESS_KEY_ID /
 * S3_SECRET_ACCESS_KEY / S3_ENDPOINT (see .env.example). Not wired to an SDK
 * here to avoid an unused dependency when running locally with the default
 * `local` provider — swap in `@aws-sdk/client-s3` and implement put/get/delete
 * against S3_BUCKET when deploying with STORAGE_PROVIDER=s3.
 */
class S3StorageProvider implements StorageProvider {
  async put(): Promise<void> {
    throw new Error(
      "S3 storage provider is not configured. Set STORAGE_PROVIDER=local for development, or implement the S3 client in src/lib/storage.ts using your S3_* environment variables before enabling it in production.",
    );
  }
  async get(): Promise<Buffer> {
    throw new Error("S3 storage provider is not configured.");
  }
  async delete(): Promise<void> {
    throw new Error("S3 storage provider is not configured.");
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
