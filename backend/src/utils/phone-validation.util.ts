export class PhoneValidationUtil {
  // Basic phone validation - accepts international format
  static isValidPhone(phone: string): boolean {
    if (!phone) return false;
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Must have at least 10 digits
    const digitsOnly = cleaned.replace(/\+/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      return false;
    }
    
    // Basic format check
    return /^\+?[\d]{10,15}$/.test(cleaned);
  }

  static normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  }
}

