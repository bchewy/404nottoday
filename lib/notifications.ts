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
  previousVersion?: string | null;
  currentVersion?: string | null;
  timestamp: string;
}

interface TelegramConfig {
  token: string;
  chatId: string;
}

export async function sendWebhookNotifications(
  service: Service,
  previousStatus: string,
  currentStatus: string,
  previousVersion?: string | null,
  currentVersion?: string | null,
  eventType?: string
) {
  // Determine event type if not provided
  let event = eventType;
  if (!event) {
    if (previousVersion !== currentVersion) {
      event = 'VERSION_CHANGE';
    } else {
      event = currentStatus === 'UP' ? 'SERVICE_UP' : 'SERVICE_DOWN';
    }
  }
  
  // Also support a generic STATUS_CHANGE event for up/down
  const relevantEvents = [event];
  if (event === 'SERVICE_UP' || event === 'SERVICE_DOWN') {
    relevantEvents.push('STATUS_CHANGE');
  }

  try {
    // Fetch enabled webhooks that are subscribed to these events
    // Note: events is a comma-separated string in DB
    const webhooks = await prisma.webhook.findMany({
      where: {
        enabled: true
      }
    });

    // Filter manually in application code
    const activeWebhooks = webhooks.filter(webhook => {
      const webhookEvents = (webhook.events || []).map(e => e.trim());
      return relevantEvents.some(ev => ev && webhookEvents.includes(ev));
    });

    if (activeWebhooks.length === 0) return;

    const payload: WebhookPayload = {
      event: event || 'UNKNOWN_EVENT',
      service: {
        id: service.id,
        name: service.name,
        url: service.url,
      },
      previousStatus,
      currentStatus,
      previousVersion,
      currentVersion,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Notifications] Sending ${activeWebhooks.length} notifications for ${service.name} (Event: ${event})`);

    // Send notifications in parallel
    await Promise.all(
      activeWebhooks.map(async (webhook) => {
        try {
          if (webhook.type === 'TELEGRAM' && webhook.config) {
            const config = webhook.config as unknown as TelegramConfig;
            let message = '';
            
            if (event === 'SERVICE_DOWN') {
              message = `🚨 *Service Down*\n\n*Service:* ${service.name}\n*URL:* ${service.url}\n*Status:* DOWN 🔴`;
            } else if (event === 'SERVICE_UP') {
              message = `✅ *Service Recovered*\n\n*Service:* ${service.name}\n*URL:* ${service.url}\n*Status:* UP 🟢`;
            } else if (event === 'VERSION_CHANGE') {
              message = `ℹ️ *Version Change*\n\n*Service:* ${service.name}\n*From:* ${previousVersion || 'Unknown'}\n*To:* ${currentVersion || 'Unknown'}`;
            } else {
              message = `📢 *Status Change*\n\n*Service:* ${service.name}\n*Event:* ${event}\n*Status:* ${currentStatus}`;
            }

            const tgUrl = `https://api.telegram.org/bot${config.token}/sendMessage`;
            const tgRes = await fetch(tgUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: config.chatId,
                text: message,
                parse_mode: 'Markdown'
              })
            });

            if (!tgRes.ok) {
              const err = await tgRes.text();
              console.warn(`[Notifications] Failed to send Telegram message: ${err}`);
            }
          } else if (webhook.url) {
            // Standard Webhook
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
          }
        } catch (error) {
          console.error(`[Notifications] Error processing notification for ${webhook.name}:`, error);
        }
      })
    );
  } catch (error) {
    console.error('[Notifications] Error fetching webhooks:', error);
  }
}
