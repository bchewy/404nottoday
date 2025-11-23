import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Prisma Client
export const mockPrisma = {
  service: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  webhook: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  checkResult: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}));

// Test Fixtures
export const createMockService = (overrides = {}) => ({
  id: 'service-1',
  name: 'Test Service',
  url: 'https://example.com',
  expectedVersion: '1.0.0',
  environment: 'production',
  createdAt: new Date(),
  updatedAt: new Date(),
  checkResults: [],
  ...overrides,
});

export const createMockWebhook = (overrides = {}) => ({
  id: 'webhook-1',
  name: 'Test Webhook',
  url: 'https://webhook.example.com',
  type: 'WEBHOOK' as const,
  events: ['SERVICE_DOWN', 'SERVICE_UP'],
  enabled: true,
  config: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCheckResult = (overrides = {}) => ({
  id: 'check-1',
  serviceId: 'service-1',
  status: 'UP' as const,
  latency: 100,
  detectedVersion: '1.0.0',
  errorMessage: null,
  timestamp: new Date(),
  ...overrides,
});

export const createMockTelegramWebhook = (overrides = {}) => ({
  id: 'webhook-telegram-1',
  name: 'Telegram Bot',
  url: null,
  type: 'TELEGRAM' as const,
  events: ['SERVICE_DOWN', 'SERVICE_UP'],
  enabled: true,
  config: {
    token: 'test-token',
    chatId: 'test-chat-id',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
