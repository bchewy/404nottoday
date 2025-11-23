import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      include: {
        checkResults: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // Calculate statistics for each service
    const servicesWithStats = await Promise.all(
      services.map(async (service) => {
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Get all checks from last 24 hours
        const recentChecks = await prisma.checkResult.findMany({
          where: {
            serviceId: service.id,
            timestamp: { gte: last24Hours },
          },
          orderBy: { timestamp: 'desc' },
        });

        const totalChecks = recentChecks.length;
        const upChecks = recentChecks.filter((c) => c.status === 'UP').length;
        const uptime = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 0;

        const avgLatency =
          recentChecks.length > 0
            ? recentChecks.reduce((sum, c) => sum + (c.latency || 0), 0) / recentChecks.length
            : null;

        const latestCheck = service.checkResults[0] || null;

        // Get latest 50 check results for history visualization
        const history = recentChecks.slice(0, 50).map((check) => ({
          status: check.status,
          latency: check.latency,
          timestamp: check.timestamp,
        }));

        return {
          id: service.id,
          name: service.name,
          url: service.url,
          environment: service.environment,
          expectedVersion: service.expectedVersion,
          latestCheck: latestCheck
            ? {
                status: latestCheck.status,
                latency: latestCheck.latency,
                detectedVersion: latestCheck.detectedVersion,
                errorMessage: latestCheck.errorMessage,
                timestamp: latestCheck.timestamp,
              }
            : null,
          stats: {
            uptime24h: uptime,
            avgLatency24h: avgLatency,
            totalChecks24h: totalChecks,
          },
          history,
        };
      })
    );

    return NextResponse.json({
      services: servicesWithStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}

