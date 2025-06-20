import crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

export interface EncryptionConfig {
  algorithm?: string;
  keyDerivationIterations?: number;
  saltLength?: number;
  ivLength?: number;
  tagLength?: number;
  keyRotationDays?: number;
}

export interface EncryptedData {
  encrypted: string;
  salt: string;
  iv: string;
  tag: string;
  algorithm: string;
  keyVersion: number;
  encryptedAt: Date;
}

export interface EncryptionKey {
  id: string;
  version: number;
  key: Buffer;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  status: 'active' | 'rotating' | 'expired';
}

export class EncryptionService {
  private readonly config: Required<EncryptionConfig>;
  private readonly keys: Map<number, EncryptionKey> = new Map();
  private currentKeyVersion: number = 1;

  constructor(
    private readonly masterKey: string,
    config?: EncryptionConfig
  ) {
    this.config = {
      algorithm: config?.algorithm || 'aes-256-gcm',
      keyDerivationIterations: config?.keyDerivationIterations || 100000,
      saltLength: config?.saltLength || 32,
      ivLength: config?.ivLength || 16,
      tagLength: config?.tagLength || 16,
      keyRotationDays: config?.keyRotationDays || 90
    };

    // Initialize first key
    this.initializeKey();
  }

  private async initializeKey(): Promise<void> {
    const key = await this.deriveKey(this.masterKey, this.currentKeyVersion);
    this.keys.set(this.currentKeyVersion, {
      id: `key_v${this.currentKeyVersion}`,
      version: this.currentKeyVersion,
      key,
      algorithm: this.config.algorithm,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.keyRotationDays * 24 * 60 * 60 * 1000),
      status: 'active'
    });
  }

  private async deriveKey(masterKey: string, version: number): Promise<Buffer> {
    const salt = crypto.createHash('sha256')
      .update(`${masterKey}_v${version}`)
      .digest();
    
    const key = await scrypt(masterKey, salt, 32) as Buffer;
    return key;
  }

  async encrypt(plaintext: string | Buffer): Promise<EncryptedData> {
    const key = this.getCurrentKey();
    if (!key) {
      throw new Error('No encryption key available');
    }

    // Generate random salt and IV
    const salt = crypto.randomBytes(this.config.saltLength);
    const iv = crypto.randomBytes(this.config.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(this.config.algorithm, key.key, iv);

    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final()
    ]);

    // Get authentication tag for GCM mode
    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      algorithm: this.config.algorithm,
      keyVersion: key.version,
      encryptedAt: new Date()
    };
  }

  async decrypt(encryptedData: EncryptedData): Promise<Buffer> {
    const key = this.keys.get(encryptedData.keyVersion);
    if (!key) {
      throw new Error(`Encryption key version ${encryptedData.keyVersion} not found`);
    }

    // Decode from base64
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      key.key,
      iv
    );

    // Set authentication tag for GCM mode
    decipher.setAuthTag(tag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted;
  }

  async encryptField(value: any): Promise<string> {
    if (value === null || value === undefined) {
      return value;
    }

    const plaintext = typeof value === 'string' ? value : JSON.stringify(value);
    const encrypted = await this.encrypt(plaintext);
    
    // Combine all parts into a single string for storage
    return this.serializeEncryptedData(encrypted);
  }

  async decryptField(encryptedValue: string): Promise<any> {
    if (!encryptedValue || !this.isEncrypted(encryptedValue)) {
      return encryptedValue;
    }

    const encryptedData = this.deserializeEncryptedData(encryptedValue);
    const decrypted = await this.decrypt(encryptedData);
    const plaintext = decrypted.toString('utf8');

    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  }

  async encryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): Promise<T> {
    const encrypted = { ...obj };

    for (const field of fieldsToEncrypt) {
      if (field in encrypted) {
        encrypted[field] = await this.encryptField(encrypted[field]);
      }
    }

    return encrypted;
  }

  async decryptObject<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[]
  ): Promise<T> {
    const decrypted = { ...obj };

    for (const field of fieldsToDecrypt) {
      if (field in decrypted) {
        try {
          decrypted[field] = await this.decryptField(decrypted[field] as string);
        } catch (error) {
          console.error(`Failed to decrypt field ${String(field)}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }

    return decrypted;
  }

  async rotateKey(): Promise<void> {
    const currentKey = this.getCurrentKey();
    if (currentKey) {
      currentKey.status = 'rotating';
    }

    this.currentKeyVersion++;
    await this.initializeKey();

    // Schedule re-encryption of data with new key
    // This would typically be done in a background job
  }

  async reEncrypt(encryptedValue: string): Promise<string> {
    if (!this.isEncrypted(encryptedValue)) {
      return encryptedValue;
    }

    const encryptedData = this.deserializeEncryptedData(encryptedValue);
    
    // Skip if already using current key
    if (encryptedData.keyVersion === this.currentKeyVersion) {
      return encryptedValue;
    }

    // Decrypt with old key
    const decrypted = await this.decrypt(encryptedData);
    
    // Encrypt with new key
    const reEncrypted = await this.encrypt(decrypted);
    
    return this.serializeEncryptedData(reEncrypted);
  }

  // Deterministic encryption for searchable fields
  async encryptDeterministic(plaintext: string, context?: string): Promise<string> {
    const contextStr = context || 'default';
    const hmac = crypto.createHmac('sha256', this.getCurrentKey()!.key);
    hmac.update(contextStr);
    hmac.update(plaintext);
    return hmac.digest('base64');
  }

  // Format preserving encryption for specific data types
  async encryptCreditCard(cardNumber: string): Promise<string> {
    // Keep first 6 and last 4 digits for BIN and last 4
    const first6 = cardNumber.substring(0, 6);
    const last4 = cardNumber.substring(cardNumber.length - 4);
    const middle = cardNumber.substring(6, cardNumber.length - 4);
    
    // Encrypt middle digits
    const encrypted = await this.encryptDeterministic(middle, 'credit_card');
    const hashedMiddle = encrypted.substring(0, middle.length);
    
    // Replace with numbers only
    const numericHash = hashedMiddle.replace(/[^0-9]/g, '')
      .substring(0, middle.length)
      .padEnd(middle.length, '0');
    
    return `${first6}${numericHash}${last4}`;
  }

  async encryptEmail(email: string): Promise<string> {
    const [localPart, domain] = email.split('@');
    if (!domain) return email;

    // Keep first and last character of local part
    if (localPart.length <= 2) {
      return email; // Too short to mask
    }

    const first = localPart[0];
    const last = localPart[localPart.length - 1];
    const middle = localPart.substring(1, localPart.length - 1);
    
    // Hash the middle part
    const hashed = await this.encryptDeterministic(middle, 'email');
    const maskedMiddle = hashed.substring(0, 5).toLowerCase()
      .replace(/[^a-z0-9]/g, 'x');
    
    return `${first}${maskedMiddle}${last}@${domain}`;
  }

  async encryptPhone(phone: string): Promise<string> {
    // Remove non-numeric characters
    const numeric = phone.replace(/\D/g, '');
    
    if (numeric.length < 7) {
      return phone; // Too short to mask
    }

    // Keep country code and last 4 digits
    const countryCode = numeric.length > 10 ? numeric.substring(0, numeric.length - 10) : '';
    const last4 = numeric.substring(numeric.length - 4);
    const middle = numeric.substring(countryCode.length, numeric.length - 4);
    
    // Mask middle digits
    const masked = middle.replace(/\d/g, '*');
    
    return `${countryCode}${masked}${last4}`;
  }

  private getCurrentKey(): EncryptionKey | undefined {
    return this.keys.get(this.currentKeyVersion);
  }

  private serializeEncryptedData(data: EncryptedData): string {
    return `ENC:${data.keyVersion}:${data.algorithm}:${data.salt}:${data.iv}:${data.tag}:${data.encrypted}`;
  }

  private deserializeEncryptedData(serialized: string): EncryptedData {
    const parts = serialized.split(':');
    if (parts.length !== 7 || parts[0] !== 'ENC') {
      throw new Error('Invalid encrypted data format');
    }

    return {
      keyVersion: parseInt(parts[1], 10),
      algorithm: parts[2],
      salt: parts[3],
      iv: parts[4],
      tag: parts[5],
      encrypted: parts[6],
      encryptedAt: new Date()
    };
  }

  private isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith('ENC:');
  }

  // Generate data encryption key for file encryption
  async generateDataKey(): Promise<{
    plaintext: Buffer;
    encrypted: string;
  }> {
    const dataKey = crypto.randomBytes(32);
    const encrypted = await this.encrypt(dataKey);
    
    return {
      plaintext: dataKey,
      encrypted: this.serializeEncryptedData(encrypted)
    };
  }

  // Encrypt large files using streaming
  createEncryptStream(key: Buffer): {
    cipher: crypto.Cipher;
    iv: Buffer;
    tag: Promise<Buffer>;
  } {
    const iv = crypto.randomBytes(this.config.ivLength);
    const cipher = crypto.createCipheriv(this.config.algorithm, key, iv);
    
    return {
      cipher,
      iv,
      tag: new Promise((resolve) => {
        cipher.on('finish', () => {
          resolve(cipher.getAuthTag());
        });
      })
    };
  }

  createDecryptStream(key: Buffer, iv: Buffer, tag: Buffer): crypto.Decipher {
    const decipher = crypto.createDecipheriv(this.config.algorithm, key, iv);
    decipher.setAuthTag(tag);
    return decipher;
  }
}