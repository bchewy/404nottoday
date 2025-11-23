import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncServicesFromConfig } from '../sync';
import { mockPrisma, createMockService } from '../../__tests__/setup';
import * as config from '../config';

// Mock the config module
vi.mock('../config', () => ({
  loadServicesConfig: vi.fn(),
}));

describe('Sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncServicesFromConfig', () => {
    it('should create new services from config', async () => {
      const configServices = [
        {
          name: 'New Service',
          url: 'https://new-service.com',
          expectedVersion: '1.0.0',
          environment: 'production',
        },
      ];

      vi.mocked(config.loadServicesConfig).mockReturnValue(configServices);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.create.mockResolvedValue(
        createMockService({
          name: 'New Service',
          url: 'https://new-service.com',
        })
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await syncServicesFromConfig();

      expect(mockPrisma.service.findFirst).toHaveBeenCalledWith({
        where: { url: 'https://new-service.com' },
      });

      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: {
          name: 'New Service',
          url: 'https://new-service.com',
          expectedVersion: '1.0.0',
          environment: 'production',
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith('[Sync] Created service: New Service');
    });

    it('should update existing services by URL', async () => {
      const configServices = [
        {
          name: 'Updated Service Name',
          url: 'https://existing-service.com',
          expectedVersion: '2.0.0',
          environment: 'staging',
        },
      ];

      const existingService = createMockService({
        id: 'existing-id',
        name: 'Old Service Name',
        url: 'https://existing-service.com',
        expectedVersion: '1.0.0',
        environment: 'production',
      });

      vi.mocked(config.loadServicesConfig).mockReturnValue(configServices);
      mockPrisma.service.findFirst.mockResolvedValue(existingService);
      mockPrisma.service.update.mockResolvedValue(
        createMockService({
          id: 'existing-id',
          name: 'Updated Service Name',
        })
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await syncServicesFromConfig();

      expect(mockPrisma.service.update).toHaveBeenCalledWith({
        where: { id: 'existing-id' },
        data: {
          name: 'Updated Service Name',
          expectedVersion: '2.0.0',
          environment: 'staging',
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Sync] Updated service: Updated Service Name'
      );
    });

    it('should handle empty config array', async () => {
      vi.mocked(config.loadServicesConfig).mockReturnValue([]);

      const consoleSpy = vi.spyOn(console, 'log');

      await syncServicesFromConfig();

      expect(consoleSpy).toHaveBeenCalledWith('[Sync] Syncing 0 services from config...');
      expect(consoleSpy).toHaveBeenCalledWith('[Sync] Service sync completed');
      expect(mockPrisma.service.create).not.toHaveBeenCalled();
      expect(mockPrisma.service.update).not.toHaveBeenCalled();
    });

    it('should handle multiple services', async () => {
      const configServices = [
        {
          name: 'Service 1',
          url: 'https://service1.com',
          expectedVersion: '1.0.0',
          environment: 'production',
        },
        {
          name: 'Service 2',
          url: 'https://service2.com',
          expectedVersion: null,
          environment: null,
        },
      ];

      vi.mocked(config.loadServicesConfig).mockReturnValue(configServices);
      mockPrisma.service.findFirst.mockResolvedValue(null);
      mockPrisma.service.create.mockResolvedValue(createMockService());

      await syncServicesFromConfig();

      expect(mockPrisma.service.findFirst).toHaveBeenCalledTimes(2);
      expect(mockPrisma.service.create).toHaveBeenCalledTimes(2);
    });

    it('should handle mix of new and existing services', async () => {
      const configServices = [
        {
          name: 'New Service',
          url: 'https://new.com',
          expectedVersion: '1.0.0',
          environment: 'production',
        },
        {
          name: 'Updated Existing',
          url: 'https://existing.com',
          expectedVersion: '2.0.0',
          environment: 'staging',
        },
      ];

      vi.mocked(config.loadServicesConfig).mockReturnValue(configServices);

      mockPrisma.service.findFirst.mockImplementation(async ({ where }: any) => {
        if (where.url === 'https://existing.com') {
          return createMockService({
            id: 'existing-id',
            url: 'https://existing.com',
          });
        }
        return null;
      });

      mockPrisma.service.create.mockResolvedValue(createMockService());
      mockPrisma.service.update.mockResolvedValue(createMockService());

      await syncServicesFromConfig();

      expect(mockPrisma.service.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.service.update).toHaveBeenCalledTimes(1);
    });
  });
});
