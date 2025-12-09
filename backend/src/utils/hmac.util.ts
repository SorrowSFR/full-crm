import * as CryptoJS from 'crypto-js';

export class HmacUtil {
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = CryptoJS.HmacSHA256(payload, secret).toString();
    return CryptoJS.enc.Hex.stringify(CryptoJS.enc.Utf8.parse(expectedSignature)) === signature ||
           expectedSignature === signature;
  }

  static generateSignature(payload: string, secret: string): string {
    return CryptoJS.HmacSHA256(payload, secret).toString();
  }
}

