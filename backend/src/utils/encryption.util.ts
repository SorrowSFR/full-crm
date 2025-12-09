import * as CryptoJS from 'crypto-js';

export class EncryptionUtil {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32chars';

  static encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, this.ENCRYPTION_KEY).toString();
  }

  static decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

