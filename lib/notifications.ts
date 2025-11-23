import { prisma } from './db';

interface Service {
  id: string;
  name: string;
  url: string;
}

interface WebhookPayload {
  event: string;
  service: Service;
  previousStatus: string;
  currentStatus: string;
  timestamp: string;
}

export async function sendWebhookNotifications(
  service: Service,
  previousStatus: string,
  currentStatus: string
) {
  // Determine event type
  const event = currentStatus === 'UP' ? 'SERVICE_UP' : 'SERVICE_DOWN';
  
  // Also support a generic STATUS_CHANGE event
  const relevantEvents = [event, 'STATUS_CHANGE'];

  try {
    // Fetch enabled webhooks that are subscribed to these events
    const webhooks = await prisma.webhook.findMany({
      where: {
        enabled: true,
        events: {
          hasSome: relevantEvents
        }
      }
    });

    if (webhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      service: {
        id: service.id,
        name: service.name,
        url: service.url,
      },
      previousStatus,
      currentStatus,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Notifications] Sending ${webhooks.length} webhooks for ${service.name} (${previousStatus} -> ${currentStatus})`);

    // Send notifications in parallel
    await Promise.all(
      webhooks.map(async (webhook) => {
        try {
          const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': '404NotToday-Webhook-Bot/1.0',
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            console.warn(`[Notifications] Failed to send webhook to ${webhook.url}: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.error(`[Notifications] Error sending webhook to ${webhook.url}:`, error);
        }
      })
    );
  } catch (error) {
    console.error('[Notifications] Error fetching webhooks:', error);
  }
}
