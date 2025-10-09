/**
 * Security utility tests
 * Tests input sanitization and validation functions
 */

import {
  sanitizeHTML,
  escapeHTML,
  sanitizeText,
  sanitizeForDisplay,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeFilename,
  validateFileType,
  validateFileSize,
  sanitizeSearchQuery,
  sanitizeURL,
  sanitizeJSON,
  checkRateLimit,
  SECURITY_CONSTANTS
} from '../security';

describe('Security Utils', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHTML(input);
      expect(result).toBe('<p>Safe content</p>');
    });

    it('should remove dangerous event handlers', () => {
      const input = '<div onclick="alert(\'xss\')">Content</div>';
      const result = sanitizeHTML(input);
      expect(result).toBe('<div>Content</div>');
    });

    it('should remove javascript: protocols', () => {
      const input = '<a href="javascript:alert(\'xss\')">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).toBe('<a href="">Link</a>');
    });
  });

  describe('escapeHTML', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHTML(input);
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags and escape characters', () => {
      const input = '<script>alert("xss")</script>Safe text';
      const result = sanitizeText(input);
      expect(result).toBe('Safe text');
    });

    it('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should sanitize valid email', () => {
      const input = 'user@example.com';
      const result = sanitizeEmail(input);
      expect(result).toBe('user@example.com');
    });

    it('should reject invalid email', () => {
      const input = 'invalid-email';
      const result = sanitizeEmail(input);
      expect(result).toBe('');
    });

    it('should handle email with HTML', () => {
      const input = '<script>alert("xss")</script>user@example.com';
      const result = sanitizeEmail(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should sanitize valid phone number', () => {
      const input = '+91 9876543210';
      const result = sanitizePhone(input);
      expect(result).toBe('+919876543210');
    });

    it('should reject invalid phone number', () => {
      const input = '123';
      const result = sanitizePhone(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    it('should sanitize valid number', () => {
      const input = '123.45';
      const result = sanitizeNumber(input);
      expect(result).toBe(123.45);
    });

    it('should respect min/max bounds', () => {
      const input = '150';
      const result = sanitizeNumber(input, 100, 200);
      expect(result).toBe(150);
    });

    it('should reject number outside bounds', () => {
      const input = '50';
      const result = sanitizeNumber(input, 100, 200);
      expect(result).toBe(null);
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize valid filename', () => {
      const input = 'document.pdf';
      const result = sanitizeFilename(input);
      expect(result).toBe('document.pdf');
    });

    it('should remove path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const result = sanitizeFilename(input);
      expect(result).toBe('etcpasswd');
    });

    it('should remove dangerous characters', () => {
      const input = 'file<>:"|?*.txt';
      const result = sanitizeFilename(input);
      expect(result).toBe('file.txt');
    });
  });

  describe('validateFileType', () => {
    it('should validate image files', () => {
      expect(validateFileType('image.jpg', ['.jpg', '.png'])).toBe(true);
      expect(validateFileType('image.gif', ['.jpg', '.png'])).toBe(false);
    });

    it('should validate MIME types', () => {
      expect(validateFileType('image.jpg', ['image/jpeg'])).toBe(true);
      expect(validateFileType('image.png', ['image/jpeg'])).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate file size', () => {
      expect(validateFileSize(1024, 2048)).toBe(true);
      expect(validateFileSize(2048, 1024)).toBe(false);
    });
  });

  describe('sanitizeSearchQuery', () => {
    it('should sanitize search query', () => {
      const input = '<script>alert("xss")</script>search term';
      const result = sanitizeSearchQuery(input);
      expect(result).toBe('search term');
    });

    it('should limit length', () => {
      const input = 'a'.repeat(150);
      const result = sanitizeSearchQuery(input);
      expect(result.length).toBe(100);
    });
  });

  describe('sanitizeURL', () => {
    it('should sanitize valid URL', () => {
      const input = 'https://example.com';
      const result = sanitizeURL(input);
      expect(result).toBe('https://example.com/');
    });

    it('should reject invalid URL', () => {
      const input = 'javascript:alert("xss")';
      const result = sanitizeURL(input);
      expect(result).toBe('');
    });
  });

  describe('sanitizeJSON', () => {
    it('should sanitize valid JSON', () => {
      const input = '{"name": "John", "age": 30}';
      const result = sanitizeJSON(input);
      expect(result).toBe('{"name":"John","age":30}');
    });

    it('should remove prototype pollution', () => {
      const input = '{"__proto__": {"isAdmin": true}}';
      const result = sanitizeJSON(input);
      expect(result).toBe('{}');
    });
  });

  describe('SECURITY_CONSTANTS', () => {
    it('should have correct values', () => {
      expect(SECURITY_CONSTANTS.MAX_TEXT_LENGTH).toBe(1000);
      expect(SECURITY_CONSTANTS.MAX_EMAIL_LENGTH).toBe(254);
      expect(SECURITY_CONSTANTS.MAX_PHONE_LENGTH).toBe(15);
      expect(SECURITY_CONSTANTS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
  });
});
