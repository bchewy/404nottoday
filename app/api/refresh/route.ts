import { NextResponse } from 'next/server';
import { pollAllServices } from '@/lib/poller';

export async function POST() {
  try {
    await pollAllServices();
    return NextResponse.json({ success: true, message: 'Services polled successfully' });
  } catch (error) {
    console.error('Error during manual refresh:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to poll services' },
      { status: 500 }
    );
  }
}

