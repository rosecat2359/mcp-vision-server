import crypto from "node:crypto";
import { AppError } from "./errors.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;  // 96 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

export interface EncryptedPayload {
  ciphertext: string;  // base64
  iv: string;          // base64
  tag: string;         // base64
}

function masterKeyToBuffer(hexKey: string): Buffer {
  return Buffer.from(hexKey, "hex");
}

export function encrypt(plaintext: string, masterKeyHex: string): EncryptedPayload {
  try {
    const key = masterKeyToBuffer(masterKeyHex);
    if (key.length !== KEY_LENGTH) {
      throw new AppError(500, "ENCRYPTION_FAILED", "主密钥长度错误，需要 64 hex 字符 (32 bytes)");
    }
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
    };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(500, "ENCRYPTION_FAILED", "加密操作失败", e);
  }
}

export function decrypt(payload: EncryptedPayload, masterKeyHex: string): string {
  try {
    const key = masterKeyToBuffer(masterKeyHex);
    if (key.length !== KEY_LENGTH) {
      throw new AppError(500, "ENCRYPTION_FAILED", "主密钥长度错误，需要 64 hex 字符 (32 bytes)");
    }
    const iv = Buffer.from(payload.iv, "base64");
    const tag = Buffer.from(payload.tag, "base64");
    const ciphertext = Buffer.from(payload.ciphertext, "base64");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(500, "ENCRYPTION_FAILED", "解密操作失败，数据可能已损坏或密钥不匹配", e);
  }
}

export function maskKey(key: string): string {
  if (key.length <= 10) {
    return "*".repeat(key.length);
  }
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  const masked = "*".repeat(Math.min(4, key.length - 10));
  return `${prefix}${masked}...${masked}${suffix}`;
}
