import { describe, expect, it } from 'vitest';
import { sanitizeImageUrl, sanitizeLinkUrl } from './security';

describe('sanitizeImageUrl', () => {
  it('allows http(s) URLs', () => {
    expect(sanitizeImageUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(sanitizeImageUrl('http://example.com/a.jpg')).toBe('http://example.com/a.jpg');
  });
  it('allows safe data:image URLs', () => {
    expect(sanitizeImageUrl('data:image/png;base64,iVBORw0KGgo=')).toBeTruthy();
  });
  it('rejects javascript: and vbscript:', () => {
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('  JAVASCRIPT:alert(1)')).toBeNull();
    expect(sanitizeImageUrl('vbscript:msgbox(1)')).toBeNull();
  });
  it('rejects data:text/html', () => {
    expect(sanitizeImageUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });
  it('rejects empty input', () => {
    expect(sanitizeImageUrl('')).toBeNull();
    expect(sanitizeImageUrl('   ')).toBeNull();
  });
});

describe('sanitizeLinkUrl', () => {
  it('allows http(s) and mailto', () => {
    expect(sanitizeLinkUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeLinkUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });
  it('rejects javascript:', () => {
    expect(sanitizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeLinkUrl('jAvAsCrIpT:alert(1)')).toBeNull();
  });
});
