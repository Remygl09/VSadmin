import { describe, it, expect } from 'vitest';
import { formatPhoneNumber } from '@/lib/formatPhone';

describe('formatPhoneNumber', () => {
  it('returns empty string for empty input', () => {
    expect(formatPhoneNumber('')).toBe('');
  });

  it('formats partial 3-digit number', () => {
    expect(formatPhoneNumber('646')).toBe('646');
  });

  it('formats 6-digit number with dash', () => {
    expect(formatPhoneNumber('646315')).toBe('646-315');
  });

  it('formats full 10-digit US number', () => {
    expect(formatPhoneNumber('6463152195')).toBe('646-315-2195');
  });

  it('formats 11-digit number with +1 prefix', () => {
    expect(formatPhoneNumber('+16463152195')).toBe('+1 646-315-2195');
  });

  it('handles already formatted input', () => {
    expect(formatPhoneNumber('646-315-2195')).toBe('646-315-2195');
  });

  it('strips non-digit characters', () => {
    expect(formatPhoneNumber('(646) 315-2195')).toBe('646-315-2195');
  });
});
