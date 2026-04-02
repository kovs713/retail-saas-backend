export const getClientIp = (ip?: string, xForwardedFor?: string): string => {
  if (xForwardedFor) {
    const forwarded = xForwardedFor
      .split(',')
      .map((part) => part.trim())
      .find(Boolean);
    if (forwarded) {
      return forwarded;
    }
  }

  if (ip) {
    return ip;
  }

  return 'unknown';
};

export const parseTrustedIps = (value: string): Set<string> =>
  new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
