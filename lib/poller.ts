import { prisma } from './db';
import { sendWebhookNotifications } from './notifications';

interface PollResult {
  serviceId: string;
  status: 'UP' | 'DOWN' | 'ERROR';
  latency: number | null;
  detectedVersion: string | null;
  errorMessage: string | null;
}

/**
 * Attempts to detect version from response
 * Checks for common patterns: JSON body with "version" field, X-Version header, etc.
 */
function detectVersion(response: Response, body: unknown): string | null {
  // Check X-Version header
  const headerVersion = response.headers.get('X-Version') || response.headers.get('x-version');
  if (headerVersion) {
    return headerVersion;
  }

  // Check if body is JSON and has a version field
  if (typeof body === 'object' && body !== null && 'version' in body) {
    return String((body as { version: unknown }).version);
  }

  return null;
}

/**
 * Polls a single service endpoint
 */
async function pollService(service: {
  id: string;
  name: string;
  url: string;
}): Promise<PollResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(service.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ServiceReliabilityMonitor/1.0',
      },
    });

    clearTimeout(timeoutId);

    const latency = Date.now() - startTime;

    // Try to parse response body as JSON
    let body: unknown = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        body = await response.json();
      } catch {
        // Not valid JSON, ignore
      }
    }

    const detectedVersion = detectVersion(response, body);

    // Consider 2xx and 3xx as UP
    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return {
        serviceId: service.id,
        status: 'UP',
        latency,
        detectedVersion,
        errorMessage: null,
      };
    } else {
      return {
        serviceId: service.id,
        status: 'DOWN',
        latency,
        detectedVersion,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      serviceId: service.id,
      status: 'ERROR',
      latency,
      detectedVersion: null,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Polls all services in the database and records results
 */
export async function pollAllServices(): Promise<void> {
  console.log('[Poller] Starting poll cycle...');

  const services = await prisma.service.findMany({
    select: {
      id: true,
      name: true,
      url: true,
      checkResults: {
        orderBy: { timestamp: 'desc' },
        take: 1,
        select: { 
          status: true,
          detectedVersion: true 
        },
      },
    },
  });

  if (services.length === 0) {
    console.log('[Poller] No services to poll');
    return;
  }

  console.log(`[Poller] Polling ${services.length} services...`);

  // Poll all services in parallel
  const results = await Promise.all(services.map((service) => pollService(service)));

  // Record all results and send notifications
  await Promise.all(
    results.map(async (result) => {
      const service = services.find((s) => s.id === result.serviceId);
      if (!service) return;

      const previousCheck = service.checkResults[0];
      const previousStatus = previousCheck?.status || 'UNKNOWN';
      const previousVersion = previousCheck?.detectedVersion;

      // Save result
      await prisma.checkResult.create({
        data: {
          serviceId: result.serviceId,
          status: result.status,
          latency: result.latency,
          detectedVersion: result.detectedVersion,
          errorMessage: result.errorMessage,
        },
      });

      // Check for status change
      if (previousStatus !== 'UNKNOWN' && result.status !== previousStatus) {
        await sendWebhookNotifications(
          {
            id: service.id,
            name: service.name,
            url: service.url,
          },
          previousStatus,
          result.status,
          previousVersion,
          result.detectedVersion
        );
      }
      // Check for version change (only if status didn't change, otherwise handled above)
      else if (
        result.status === 'UP' && 
        previousVersion && 
        result.detectedVersion && 
        result.detectedVersion !== previousVersion
      ) {
        await sendWebhookNotifications(
          {
            id: service.id,
            name: service.name,
            url: service.url,
          },
          previousStatus,
          result.status,
          previousVersion,
          result.detectedVersion,
          'VERSION_CHANGE'
        );
      }
    })
  );

  console.log(`[Poller] Poll cycle completed. Recorded ${results.length} results.`);
}
