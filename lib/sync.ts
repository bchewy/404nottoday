import { prisma } from './db';
import { loadServicesConfig } from './config';

/**
 * Syncs services from services.json to the database
 * Creates new services and updates existing ones based on URL
 */
export async function syncServicesFromConfig() {
  const configServices = loadServicesConfig();

  console.log(`[Sync] Syncing ${configServices.length} services from config...`);

  for (const configService of configServices) {
    // Find existing service by URL (URL is the unique identifier)
    const existing = await prisma.service.findFirst({
      where: { url: configService.url },
    });

    if (existing) {
      // Update existing service
      await prisma.service.update({
        where: { id: existing.id },
        data: {
          name: configService.name,
          expectedVersion: configService.expectedVersion,
          environment: configService.environment,
        },
      });
      console.log(`[Sync] Updated service: ${configService.name}`);
    } else {
      // Create new service
      await prisma.service.create({
        data: {
          name: configService.name,
          url: configService.url,
          expectedVersion: configService.expectedVersion,
          environment: configService.environment,
        },
      });
      console.log(`[Sync] Created service: ${configService.name}`);
    }
  }

  console.log('[Sync] Service sync completed');
}

