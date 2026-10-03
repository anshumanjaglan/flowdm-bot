import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// GET handler for Meta's Webhook Verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  // Check if a request is valid
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// POST handler for receiving incoming messages/comments
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // 1. Verify the signature (Security check)
    if (signature && process.env.META_APP_SECRET) {
      const expectedSignature = `sha256=${crypto
        .createHmac('sha256', process.env.META_APP_SECRET)
        .update(body)
        .digest('hex')}`;

      if (signature !== expectedSignature) {
        console.error('Invalid signature');
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    // Parse the JSON payload
    const payload = JSON.parse(body);
    console.log('--- META WEBHOOK RECEIVED ---');
    console.log(JSON.stringify(payload, null, 2));

    // TODO: Forward payload to Upstash QStash for reliable background processing
    
    // Meta requires a 200 OK response quickly to acknowledge receipt
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Server Error', { status: 500 });
  }
}
