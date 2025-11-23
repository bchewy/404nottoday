import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../webhooks/route';
import { DELETE, PATCH } from '../webhooks/[id]/route';
import { POST as TEST_POST } from '../webhooks/[id]/test/route';
import { mockPrisma, createMockWebhook, createMockTelegramWebhook } from '../../../__tests__/setup';

describe('Webhooks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/webhooks', () => {
    it('should return all webhooks ordered by createdAt desc', async () => {
      const mockWebhooks = [
        createMockWebhook({ id: 'webhook-1', name: 'Webhook 1' }),
        createMockWebhook({ id: 'webhook-2', name: 'Webhook 2' }),
      ];

      mockPrisma.webhook.findMany.mockResolvedValue(mockWebhooks);

      const response = await GET();
      const data = await response.json();

      expect(mockPrisma.webhook.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(data).toHaveLength(2);
      expect(data[0]).toMatchObject({
        id: 'webhook-1',
        name: 'Webhook 1',
      });
      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      mockPrisma.webhook.findMany.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({ error: 'Failed to fetch webhooks' });
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/webhooks', () => {
    it('should create webhook with valid data', async () => {
      const requestBody = {
        name: 'Test Webhook',
        url: 'https://webhook.example.com',
        events: ['SERVICE_DOWN', 'SERVICE_UP'],
        type: 'WEBHOOK',
      };

      const mockWebhook = createMockWebhook(requestBody);
      mockPrisma.webhook.create.mockResolvedValue(mockWebhook);

      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Webhook',
          url: 'https://webhook.example.com',
          events: ['SERVICE_DOWN', 'SERVICE_UP'],
          type: 'WEBHOOK',
          config: undefined,
        },
      });
      expect(data).toMatchObject({
        id: mockWebhook.id,
        name: mockWebhook.name,
        url: mockWebhook.url,
        type: mockWebhook.type,
        events: mockWebhook.events,
      });
      expect(response.status).toBe(201);
    });

    it('should return 400 when name missing', async () => {
      const requestBody = {
        url: 'https://webhook.example.com',
        events: ['SERVICE_DOWN'],
      };

      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'Missing required fields' });
      expect(response.status).toBe(400);
    });

    it('should return 400 when events missing', async () => {
      const requestBody = {
        name: 'Test Webhook',
        url: 'https://webhook.example.com',
      };

      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'Missing required fields' });
      expect(response.status).toBe(400);
    });

    it('should return 400 when URL missing for WEBHOOK type', async () => {
      const requestBody = {
        name: 'Test Webhook',
        events: ['SERVICE_DOWN'],
        type: 'WEBHOOK',
      };

      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'URL is required for Webhook type' });
      expect(response.status).toBe(400);
    });

    it('should return 400 when token/chatId missing for TELEGRAM type', async () => {
      const requestBody = {
        name: 'Telegram Bot',
        events: ['SERVICE_DOWN'],
        type: 'TELEGRAM',
        config: { token: 'test-token' },
      };

      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'Bot Token and Chat ID are required for Telegram type' });
      expect(response.status).toBe(400);
    });

    it('should handle array or single event value', async () => {
      const requestBodyWithString = {
        name: 'Test Webhook',
        url: 'https://webhook.example.com',
        events: 'SERVICE_DOWN',
        type: 'WEBHOOK',
      };

      mockPrisma.webhook.create.mockResolvedValue(createMockWebhook());

      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(requestBodyWithString),
      });

      await POST(request);

      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          events: ['SERVICE_DOWN'],
        }),
      });
    });

    it('should create Telegram webhook with valid config', async () => {
      const requestBody = {
        name: 'Telegram Bot',
        events: ['SERVICE_DOWN'],
        type: 'TELEGRAM',
        config: {
          token: 'test-token',
          chatId: 'test-chat-id',
        },
      };

      mockPrisma.webhook.create.mockResolvedValue(createMockTelegramWebhook());

      const request = new Request('http://localhost:3000/api/webhooks', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(mockPrisma.webhook.create).toHaveBeenCalledWith({
        data: {
          name: 'Telegram Bot',
          url: undefined,
          events: ['SERVICE_DOWN'],
          type: 'TELEGRAM',
          config: {
            token: 'test-token',
            chatId: 'test-chat-id',
          },
        },
      });
      expect(response.status).toBe(201);
    });
  });

  describe('DELETE /api/webhooks/[id]', () => {
    it('should delete webhook by ID', async () => {
      mockPrisma.webhook.delete.mockResolvedValue(createMockWebhook());

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(mockPrisma.webhook.delete).toHaveBeenCalledWith({
        where: { id: 'webhook-1' },
      });
      expect(data).toEqual({ success: true });
      expect(response.status).toBe(200);
    });

    it('should return 500 on error', async () => {
      mockPrisma.webhook.delete.mockRejectedValue(new Error('Delete failed'));

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(data).toEqual({ error: 'Failed to delete webhook' });
      expect(response.status).toBe(500);
    });
  });

  describe('PATCH /api/webhooks/[id]', () => {
    it('should update enabled status', async () => {
      const mockWebhook = createMockWebhook({ enabled: false });
      mockPrisma.webhook.update.mockResolvedValue(mockWebhook);

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'webhook-1' },
        data: { enabled: false },
      });
      expect(data).toMatchObject({
        id: mockWebhook.id,
        enabled: false,
      });
      expect(response.status).toBe(200);
    });

    it('should update events array', async () => {
      const mockWebhook = createMockWebhook({ events: ['SERVICE_UP'] });
      mockPrisma.webhook.update.mockResolvedValue(mockWebhook);

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'PATCH',
        body: JSON.stringify({ events: ['SERVICE_UP'] }),
      });

      const response = await PATCH(request, { params });

      expect(mockPrisma.webhook.update).toHaveBeenCalledWith({
        where: { id: 'webhook-1' },
        data: { events: ['SERVICE_UP'] },
      });
      expect(response.status).toBe(200);
    });

    it('should return updated webhook', async () => {
      const updatedWebhook = createMockWebhook({
        id: 'webhook-1',
        enabled: false,
        events: ['VERSION_CHANGE'],
      });
      mockPrisma.webhook.update.mockResolvedValue(updatedWebhook);

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false, events: ['VERSION_CHANGE'] }),
      });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(data).toMatchObject({
        id: updatedWebhook.id,
        enabled: false,
        events: ['VERSION_CHANGE'],
      });
    });

    it('should return 500 on error', async () => {
      mockPrisma.webhook.update.mockRejectedValue(new Error('Update failed'));

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1', {
        method: 'PATCH',
        body: JSON.stringify({ enabled: false }),
      });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(data).toEqual({ error: 'Failed to update webhook' });
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/webhooks/[id]/test', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should send test notification to standard webhook', async () => {
      const webhook = createMockWebhook({
        id: 'webhook-1',
        url: 'https://webhook.example.com',
      });

      mockPrisma.webhook.findUnique.mockResolvedValue(webhook);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1/test', {
        method: 'POST',
      });

      const response = await TEST_POST(request, { params });
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://webhook.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': '404NotToday-Webhook-Bot/1.0',
          },
        })
      );
      expect(data).toEqual({ success: true });
    });

    it('should send test notification to Telegram', async () => {
      const webhook = createMockTelegramWebhook({
        id: 'webhook-1',
      });

      mockPrisma.webhook.findUnique.mockResolvedValue(webhook);
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const params = Promise.resolve({ id: 'webhook-1' });
      const request = new Request('http://localhost:3000/api/webhooks/webhook-1/test', {
        method: 'POST',
      });

      const response = await TEST_POST(request, { params });
      const data = await response.json();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token/sendMessage',
        expect.any(Object)
      );
      expect(data).toEqual({ success: true });
    });

    it('should return 404 when webhook not found', async () => {
      mockPrisma.webhook.findUnique.mockResolvedValue(null);

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost:3000/api/webhooks/nonexistent/test', {
        method: 'POST',
      });

      const response = await TEST_POST(request, { params });
      const data = await response.json();

      expect(data).toEqual({ error: 'Webhook not found' });
      expect(response.status).toBe(404);
    });
  });
});
