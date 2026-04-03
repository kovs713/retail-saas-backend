import { getClientIp, parseTrustedIps } from './ip.util';

describe('ip util', () => {
  it('should pick x-forwarded-for first ip', () => {
    const ip = getClientIp('127.0.0.1', '10.0.0.1, 10.0.0.2');
    expect(ip).toBe('10.0.0.1');
  });

  it('should fallback to request ip', () => {
    const ip = getClientIp('127.0.0.1');
    expect(ip).toBe('127.0.0.1');
  });

  it('should return unknown when no ip provided', () => {
    const ip = getClientIp(undefined, undefined);
    expect(ip).toBe('unknown');
  });

  it('should parse trusted ips', () => {
    const trusted = parseTrustedIps('1.1.1.1, 2.2.2.2');
    expect(trusted.has('1.1.1.1')).toBe(true);
    expect(trusted.has('2.2.2.2')).toBe(true);
  });

  it('should return empty set for empty string', () => {
    const trusted = parseTrustedIps('');
    expect(trusted.size).toBe(0);
  });
});
