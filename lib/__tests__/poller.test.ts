import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pollAllServices } from '../poller';
import { mockPrisma, createMockService, createMockCheckResult } from '../../__tests__/setup';
import * as notifications from '../notifications';

// Mock the notifications module
vi.mock('../notifications', () => ({
  sendWebhookNotifications: vi.fn(),
}));

describe('Poller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('pollAllServices', () => {
    it('should skip when no services exist', async () => {
      mockPrisma.service.findMany.mockResolvedValue([]);
      const consoleSpy = vi.spyOn(console, 'log');

      await pollAllServices();

      expect(mockPrisma.service.findMany).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[Poller] No services to poll');
      expect(mockPrisma.checkResult.create).not.toHaveBeenCalled();
    });

    it('should poll all services and create check results', async () => {
      const mockService = createMockService({
        id: 'service-1',
        name: 'Test Service',
        url: 'https://example.com',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ version: '1.0.0' }),
      });

      await pollAllServices();

      expect(mockPrisma.service.findMany).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'User-Agent': 'ServiceReliabilityMonitor/1.0',
          },
        })
      );
      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          serviceId: 'service-1',
          status: 'UP',
          latency: expect.any(Number),
        }),
      });
    });

    it('should detect version from X-Version header', async () => {
      const mockService = createMockService({
        id: 'service-1',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      const mockHeaders = new Map();
      mockHeaders.set = vi.fn();
      mockHeaders.get = vi.fn((key: string) => {
        if (key === 'X-Version' || key === 'x-version') return '2.0.0';
        if (key === 'content-type') return 'text/html';
        return null;
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        json: async () => ({}),
      });

      await pollAllServices();

      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          detectedVersion: '2.0.0',
        }),
      });
    });

    it('should detect version from JSON body', async () => {
      const mockService = createMockService({
        id: 'service-1',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      const mockHeaders = new Map();
      mockHeaders.set = vi.fn();
      mockHeaders.get = vi.fn((key: string) => {
        if (key === 'content-type') return 'application/json';
        return null;
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        json: async () => ({ version: '3.0.0' }),
      });

      await pollAllServices();

      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          detectedVersion: '3.0.0',
        }),
      });
    });

    it('should return UP status for 2xx responses', async () => {
      const mockService = createMockService({
        id: 'service-1',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'text/html']]),
      });

      await pollAllServices();

      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'UP',
          errorMessage: null,
        }),
      });
    });

    it('should return UP status for 3xx redirects', async () => {
      const mockService = createMockService({
        id: 'service-1',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 301,
        statusText: 'Moved Permanently',
        headers: new Map([['content-type', 'text/html']]),
      });

      await pollAllServices();

      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'UP',
        }),
      });
    });

    it('should return DOWN status for 4xx/5xx errors', async () => {
      const mockService = createMockService({
        id: 'service-1',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'text/html']]),
      });

      await pollAllServices();

      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DOWN',
          errorMessage: 'HTTP 500: Internal Server Error',
        }),
      });
    });

    it('should return ERROR status on network failures', async () => {
      const mockService = createMockService({
        id: 'service-1',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await pollAllServices();

      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'ERROR',
          errorMessage: 'Network error',
        }),
      });
    });

    it('should call sendWebhookNotifications on status change', async () => {
      const mockService = createMockService({
        id: 'service-1',
        name: 'Test Service',
        url: 'https://example.com',
        checkResults: [
          {
            status: 'UP',
            detectedVersion: '1.0.0',
          },
        ],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      (global.fetch as any).mockRejectedValue(new Error('Service unavailable'));

      await pollAllServices();

      expect(notifications.sendWebhookNotifications).toHaveBeenCalledWith(
        {
          id: 'service-1',
          name: 'Test Service',
          url: 'https://example.com',
        },
        'UP',
        'ERROR',
        '1.0.0',
        null
      );
    });

    it('should call sendWebhookNotifications on version change', async () => {
      const mockService = createMockService({
        id: 'service-1',
        name: 'Test Service',
        url: 'https://example.com',
        checkResults: [
          {
            status: 'UP',
            detectedVersion: '1.0.0',
          },
        ],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      const mockHeaders = new Map();
      mockHeaders.set = vi.fn();
      mockHeaders.get = vi.fn((key: string) => {
        if (key === 'content-type') return 'application/json';
        return null;
      });

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: mockHeaders,
        json: async () => ({ version: '2.0.0' }),
      });

      await pollAllServices();

      expect(notifications.sendWebhookNotifications).toHaveBeenCalledWith(
        {
          id: 'service-1',
          name: 'Test Service',
          url: 'https://example.com',
        },
        'UP',
        'UP',
        '1.0.0',
        '2.0.0',
        'VERSION_CHANGE'
      );
    });

    it('should calculate latency correctly', async () => {
      const mockService = createMockService({
        id: 'service-1',
        checkResults: [],
      });

      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.checkResult.create.mockResolvedValue(createMockCheckResult());

      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  statusText: 'OK',
                  headers: new Map([['content-type', 'text/html']]),
                }),
              100
            );
          })
      );

      await pollAllServices();

      expect(mockPrisma.checkResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latency: expect.any(Number),
        }),
      });

      const latency = mockPrisma.checkResult.create.mock.calls[0][0].data.latency;
      expect(latency).toBeGreaterThanOrEqual(90);
    });
  });
});
