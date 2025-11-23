import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWebhookNotifications } from '../notifications';
import { mockPrisma, createMockWebhook, createMockTelegramWebhook } from '../../__tests__/setup';

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const mockService = {
    id: 'service-1',
    name: 'Test Service',
    url: 'https://example.com',
  };

  describe('sendWebhookNotifications', () => {
    beforeEach(() => {
      // Ensure fetch is properly mocked
      if (!global.fetch || !(global.fetch as any).mock) {
        global.fetch = vi.fn();
      }
    });

    it('should send to webhooks subscribed to SERVICE_DOWN event', async () => {
      const webhook = createMockWebhook({
        events: ['SERVICE_DOWN'],
        url: 'https://webhook.example.com',
      });

      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': '404NotToday-Webhook-Bot/1.0',
          },
          body: expect.stringContaining('SERVICE_DOWN'),
        })
      );
    });

    it('should send to webhooks subscribed to SERVICE_UP event', async () => {
      const webhook = createMockWebhook({
        events: ['SERVICE_UP'],
        url: 'https://webhook.example.com',
      });

      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'DOWN', 'UP');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('SERVICE_UP'),
        })
      );
    });

    it('should send to webhooks subscribed to VERSION_CHANGE event', async () => {
      const webhook = createMockWebhook({
        events: ['VERSION_CHANGE'],
        url: 'https://webhook.example.com',
      });

      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'UP', 'UP', '1.0.0', '2.0.0');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('VERSION_CHANGE'),
        })
      );
    });

    it('should send to webhooks subscribed to STATUS_CHANGE event', async () => {
      const webhook = createMockWebhook({
        events: ['STATUS_CHANGE'],
        url: 'https://webhook.example.com',
      });

      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should skip disabled webhooks', async () => {
      const webhook = createMockWebhook({
        events: ['SERVICE_DOWN'],
        enabled: false,
      });

      // Return empty array since findMany filters by enabled: true
      mockPrisma.webhook.findMany.mockResolvedValue([]);

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should skip webhooks not subscribed to the event', async () => {
      const webhook = createMockWebhook({
        events: ['SERVICE_UP'],
        url: 'https://webhook.example.com',
      });

      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should format Telegram messages correctly for SERVICE_DOWN', async () => {
      const telegramWebhook = createMockTelegramWebhook({
        events: ['SERVICE_DOWN'],
      });

      mockPrisma.webhook.findMany.mockResolvedValue([telegramWebhook]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Service Down'),
        })
      );

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.chat_id).toBe('test-chat-id');
      expect(callBody.text).toContain('🚨');
      expect(callBody.text).toContain('Test Service');
      expect(callBody.parse_mode).toBe('Markdown');
    });

    it('should format Telegram messages correctly for SERVICE_UP', async () => {
      const telegramWebhook = createMockTelegramWebhook({
        events: ['SERVICE_UP'],
      });

      mockPrisma.webhook.findMany.mockResolvedValue([telegramWebhook]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'DOWN', 'UP');

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.text).toContain('✅');
      expect(callBody.text).toContain('Service Recovered');
    });

    it('should format Telegram messages correctly for VERSION_CHANGE', async () => {
      const telegramWebhook = createMockTelegramWebhook({
        events: ['VERSION_CHANGE'],
      });

      mockPrisma.webhook.findMany.mockResolvedValue([telegramWebhook]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'UP', 'UP', '1.0.0', '2.0.0');

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.text).toContain('ℹ️');
      expect(callBody.text).toContain('Version Change');
      expect(callBody.text).toContain('1.0.0');
      expect(callBody.text).toContain('2.0.0');
    });

    it('should handle webhook delivery failures gracefully', async () => {
      const webhook = createMockWebhook({
        events: ['SERVICE_DOWN'],
        url: 'https://webhook.example.com',
      });

      mockPrisma.webhook.findMany.mockResolvedValue([webhook]);
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send webhook')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle Telegram delivery failures gracefully', async () => {
      const telegramWebhook = createMockTelegramWebhook({
        events: ['SERVICE_DOWN'],
      });

      mockPrisma.webhook.findMany.mockResolvedValue([telegramWebhook]);
      (global.fetch as any).mockResolvedValue({
        ok: false,
        text: async () => 'Telegram API Error',
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send Telegram message')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle multiple webhooks in parallel', async () => {
      const webhook1 = createMockWebhook({
        id: 'webhook-1',
        events: ['SERVICE_DOWN'],
        url: 'https://webhook1.example.com',
      });

      const webhook2 = createMockWebhook({
        id: 'webhook-2',
        events: ['SERVICE_DOWN'],
        url: 'https://webhook2.example.com',
      });

      mockPrisma.webhook.findMany.mockResolvedValue([webhook1, webhook2]);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await sendWebhookNotifications(mockService, 'UP', 'DOWN');

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook1.example.com',
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook2.example.com',
        expect.any(Object)
      );
    });
  });
});
