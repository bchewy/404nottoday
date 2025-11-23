import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Read services.json for dependency info
    const servicesJsonPath = path.join(process.cwd(), 'services.json');
    const servicesJson = await fs.readFile(servicesJsonPath, 'utf-8');
    const serviceConfigs = JSON.parse(servicesJson);

    // Get current services from DB
    const services = await prisma.service.findMany();

    // Build dependency map: service ID -> array of dependent service IDs
    const dependencyMap: Record<string, string[]> = {};

    services.forEach((service) => {
      const config = serviceConfigs.find((c: any) => c.name === service.name);
      if (config?.dependsOn) {
        const dependentIds = config.dependsOn
          .map((depName: string) => {
            const dep = services.find((s) => s.name === depName);
            return dep?.id;
          })
          .filter(Boolean);
        
        dependencyMap[service.id] = dependentIds;
      } else {
        dependencyMap[service.id] = [];
      }
    });

    return NextResponse.json(dependencyMap);
  } catch (error) {
    console.error('Failed to get dependencies:', error);
    return NextResponse.json({ error: 'Failed to fetch dependencies' }, { status: 500 });
  }
}
