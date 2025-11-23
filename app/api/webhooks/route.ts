import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(webhooks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, events, type = 'WEBHOOK', config } = body;

    if (!name || !events) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'WEBHOOK' && !url) {
      return NextResponse.json({ error: 'URL is required for Webhook type' }, { status: 400 });
    }

    if (type === 'TELEGRAM' && (!config?.token || !config?.chatId)) {
      return NextResponse.json({ error: 'Bot Token and Chat ID are required for Telegram type' }, { status: 400 });
    }

    const webhook = await prisma.webhook.create({
      data: {
        name,
        url, // Can be null/undefined for Telegram
        events,
        type,
        config: config ? config : undefined,
      },
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}
