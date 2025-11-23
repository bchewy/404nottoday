import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

interface TelegramConfig {
  token: string;
  chatId: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const webhook = await prisma.webhook.findUnique({
      where: { id },
    });

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    if (webhook.type === 'TELEGRAM' && webhook.config) {
      const config = webhook.config as unknown as TelegramConfig;
      try {
        const tgUrl = `https://api.telegram.org/bot${config.token}/sendMessage`;
        const response = await fetch(tgUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.chatId,
            text: '🔔 *Test Notification*\n\nThis is a test message from 404 Not Today.',
            parse_mode: 'Markdown'
          })
        });

        if (response.ok) {
          return NextResponse.json({ success: true });
        } else {
          const errorText = await response.text();
          return NextResponse.json({ 
            error: `Telegram API error: ${errorText}` 
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ 
          error: error instanceof Error ? error.message : 'Failed to send Telegram request' 
        }, { status: 500 });
      }
    } else if (webhook.url) {
      // Standard Webhook
      const payload = {
        event: 'TEST_NOTIFICATION',
        service: {
          id: 'test-service-id',
          name: 'Test Service',
          url: 'https://example.com',
        },
        previousStatus: 'UP',
        currentStatus: 'UP',
        timestamp: new Date().toISOString(),
        message: 'This is a test notification from 404 Not Today.',
      };

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': '404NotToday-Webhook-Bot/1.0',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          return NextResponse.json({ success: true });
        } else {
          return NextResponse.json({ 
            error: `Webhook responded with ${response.status}: ${response.statusText}` 
          }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ 
          error: error instanceof Error ? error.message : 'Failed to send request' 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: 'Invalid webhook configuration' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
