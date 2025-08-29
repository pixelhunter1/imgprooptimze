import { ImageProcessor, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } from '../imageProcessor';

// Mock File constructor for testing
class MockFile extends File {
  constructor(bits: BlobPart[], name: string, options?: FilePropertyBag) {
    super(bits, name, options);
  }
}

describe('ImageProcessor File Validation', () => {
  describe('validateImageFile', () => {
    it('should accept valid PNG files', () => {
      const file = new MockFile([''], 'test.png', { type: 'image/png' });
      const result = ImageProcessor.validateImageFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.fileName).toBe('test.png');
      expect(result.error).toBeUndefined();
    });

    it('should accept valid JPEG files', () => {
      const file = new MockFile([''], 'test.jpg', { type: 'image/jpeg' });
      const result = ImageProcessor.validateImageFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.fileName).toBe('test.jpg');
    });

    it('should accept valid WebP files', () => {
      const file = new MockFile([''], 'test.webp', { type: 'image/webp' });
      const result = ImageProcessor.validateImageFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.fileName).toBe('test.webp');
    });

    it('should reject files with invalid MIME types', () => {
      const file = new MockFile([''], 'test.gif', { type: 'image/gif' });
      const result = ImageProcessor.validateImageFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
      expect(result.error).toContain('image/gif');
    });

    it('should reject files with mismatched extension and MIME type', () => {
      const file = new MockFile([''], 'test.png', { type: 'image/jpeg' });
      const result = ImageProcessor.validateImageFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('doesn\'t match the file type');
      expect(result.error).toContain('security risk');
    });

    it('should reject files without extensions', () => {
      const file = new MockFile([''], 'test', { type: 'image/png' });
      const result = ImageProcessor.validateImageFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid image extension');
    });

    it('should reject non-image files', () => {
      const file = new MockFile([''], 'test.txt', { type: 'text/plain' });
      const result = ImageProcessor.validateImageFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });
  });

  describe('validateImageFiles', () => {
    it('should separate valid and invalid files correctly', () => {
      const files = [
        new MockFile([''], 'valid1.png', { type: 'image/png' }),
        new MockFile([''], 'valid2.jpg', { type: 'image/jpeg' }),
        new MockFile([''], 'invalid.gif', { type: 'image/gif' }),
        new MockFile([''], 'mismatch.png', { type: 'image/jpeg' })
      ];

      const result = ImageProcessor.validateImageFiles(files);
      
      expect(result.validFiles).toHaveLength(2);
      expect(result.invalidFiles).toHaveLength(2);
      expect(result.hasValidFiles).toBe(true);
      expect(result.hasInvalidFiles).toBe(true);
      
      expect(result.validFiles[0].name).toBe('valid1.png');
      expect(result.validFiles[1].name).toBe('valid2.jpg');
      expect(result.invalidFiles[0].fileName).toBe('invalid.gif');
      expect(result.invalidFiles[1].fileName).toBe('mismatch.png');
    });

    it('should handle all valid files', () => {
      const files = [
        new MockFile([''], 'test1.png', { type: 'image/png' }),
        new MockFile([''], 'test2.webp', { type: 'image/webp' })
      ];

      const result = ImageProcessor.validateImageFiles(files);
      
      expect(result.validFiles).toHaveLength(2);
      expect(result.invalidFiles).toHaveLength(0);
      expect(result.hasValidFiles).toBe(true);
      expect(result.hasInvalidFiles).toBe(false);
    });

    it('should handle all invalid files', () => {
      const files = [
        new MockFile([''], 'test.gif', { type: 'image/gif' }),
        new MockFile([''], 'test.bmp', { type: 'image/bmp' })
      ];

      const result = ImageProcessor.validateImageFiles(files);
      
      expect(result.validFiles).toHaveLength(0);
      expect(result.invalidFiles).toHaveLength(2);
      expect(result.hasValidFiles).toBe(false);
      expect(result.hasInvalidFiles).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should have correct allowed MIME types', () => {
      expect(ALLOWED_MIME_TYPES).toEqual([
        'image/png',
        'image/jpeg', 
        'image/webp'
      ]);
    });

    it('should have correct allowed extensions', () => {
      expect(ALLOWED_EXTENSIONS).toEqual([
        '.png',
        '.jpg',
        '.jpeg',
        '.webp'
      ]);
    });
  });
});
