import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../services/route';
import { mockPrisma, createMockService } from '../../../__tests__/setup';

describe('Services API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/services', () => {
    it('should create service with valid data', async () => {
      const requestBody = {
        name: 'Test Service',
        url: 'https://example.com',
        expectedVersion: '1.0.0',
        environment: 'production',
      };

      const mockService = createMockService(requestBody);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.create.mockResolvedValue(mockService);

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
        where: { url: 'https://example.com' },
      });

      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Service',
          url: 'https://example.com',
          expectedVersion: '1.0.0',
          environment: 'production',
        },
      });

      expect(data).toMatchObject({
        id: mockService.id,
        name: mockService.name,
        url: mockService.url,
        expectedVersion: mockService.expectedVersion,
        environment: mockService.environment,
      });
      expect(response.status).toBe(201);
    });

    it('should return 400 when name missing', async () => {
      const requestBody = {
        url: 'https://example.com',
        expectedVersion: '1.0.0',
      };

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'Name and URL are required' });
      expect(response.status).toBe(400);
      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('should return 400 when url missing', async () => {
      const requestBody = {
        name: 'Test Service',
        expectedVersion: '1.0.0',
      };

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'Name and URL are required' });
      expect(response.status).toBe(400);
      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid URL format', async () => {
      const requestBody = {
        name: 'Test Service',
        url: 'not-a-valid-url',
        expectedVersion: '1.0.0',
      };

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'Invalid URL format' });
      expect(response.status).toBe(400);
      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('should return 409 when URL already exists', async () => {
      const requestBody = {
        name: 'New Service',
        url: 'https://existing.com',
        expectedVersion: '1.0.0',
      };

      const existingService = createMockService({
        id: 'existing-service',
        url: 'https://existing.com',
      });

      mockPrisma.service.findFirst.mockResolvedValue(existingService);

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'A service with this URL already exists' });
      expect(response.status).toBe(409);
      expect(mockPrisma.service.create).not.toHaveBeenCalled();
    });

    it('should create service with null optional fields', async () => {
      const requestBody = {
        name: 'Test Service',
        url: 'https://example.com',
      };

      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.create.mockResolvedValue(createMockService());

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Service',
          url: 'https://example.com',
          expectedVersion: null,
          environment: null,
        },
      });
      expect(response.status).toBe(201);
    });

    it('should handle various valid URL formats', async () => {
      const testCases = [
        'https://example.com',
        'http://example.com:8080',
        'https://api.example.com/health',
        'https://example.com/api/v1/status',
      ];

      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.create.mockResolvedValue(createMockService());

      for (const url of testCases) {
        const request = new Request('http://localhost:3000/api/services', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Service',
            url,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(201);
      }
    });

    it('should return 500 on database error', async () => {
      const requestBody = {
        name: 'Test Service',
        url: 'https://example.com',
      };

      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.create.mockRejectedValue(new Error('Database error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({ error: 'Failed to create service' });
      expect(response.status).toBe(500);

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty string for optional fields', async () => {
      const requestBody = {
        name: 'Test Service',
        url: 'https://example.com',
        expectedVersion: '',
        environment: '',
      };

      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.create.mockResolvedValue(createMockService());

      const request = new Request('http://localhost:3000/api/services', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);

      // Empty strings should be treated as falsy and converted to null
      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Service',
          url: 'https://example.com',
          expectedVersion: null,
          environment: null,
        },
      });
      expect(response.status).toBe(201);
    });
  });
});
