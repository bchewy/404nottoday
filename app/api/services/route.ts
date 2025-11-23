import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, url, expectedVersion, environment } = body;

    // Validate required fields
    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if service with same URL already exists
    const existing = await prisma.service.findFirst({
      where: { url },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A service with this URL already exists' },
        { status: 409 }
      );
    }

    // Create the service
    const service = await prisma.service.create({
      data: {
        name,
        url,
        expectedVersion: expectedVersion || null,
        environment: environment || null,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { error: 'Failed to create service' },
      { status: 500 }
    );
  }
}

