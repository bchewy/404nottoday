import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.webhook.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled, events } = body;

    const webhook = await prisma.webhook.update({
      where: { id },
      data: {
        ...(typeof enabled === 'boolean' ? { enabled } : {}),
        ...(events ? { events } : {}),
      },
    });

    return NextResponse.json(webhook);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}
