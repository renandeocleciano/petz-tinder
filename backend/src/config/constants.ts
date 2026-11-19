export const API_PREFIX = '/v1';

export const RATE_LIMITS = {
  global: { max: 300, timeWindow: '1 minute' },
  likes: { max: 120, timeWindow: '1 minute' },
  messages: { max: 60, timeWindow: '1 minute' },
  reports: { max: 5, timeWindow: '1 hour' },
  uploads: { max: 30, timeWindow: '1 minute' },
} as const;
