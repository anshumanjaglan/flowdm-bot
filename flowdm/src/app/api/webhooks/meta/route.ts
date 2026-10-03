import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// GET handler for Meta's Webhook Verification
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
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

    const payload = JSON.parse(body);
    console.log('--- NEW META WEBHOOK EVENT ---');
    console.log(JSON.stringify(payload, null, 2));

    const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;

    // 2. Process Instagram/Facebook events
    if (payload.object === 'instagram' || payload.object === 'page') {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          
          // --- COMMENT HANDLING ---
          if (change.field === 'comments') {
            const comment = change.value;
            
            // Ignore if we are the ones who commented
            if (comment.from?.id === entry.id) continue;

            const text = comment.text || '';
            
            // KEYWORD TRIGGER: "GUIDE"
            if (text.toUpperCase().includes('GUIDE')) {
              console.log('✅ Keyword "GUIDE" detected! Triggering automation...');
              
              // Action 1: Public Auto-Reply
              const publicReplies = ["Check your DMs! 🚀", "Sent! Check your requests.", "Sliding into your DMs right now!"];
              const randomReply = publicReplies[Math.floor(Math.random() * publicReplies.length)];
              
              await fetch(`https://graph.facebook.com/v19.0/${comment.id}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PAGE_TOKEN}` },
                body: JSON.stringify({ message: randomReply })
              });

              // Action 2: Private DM Reply
              await fetch(`https://graph.facebook.com/v19.0/me/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PAGE_TOKEN}` },
                body: JSON.stringify({
                  recipient: { comment_id: comment.id },
                  message: { text: "Hey! You asked for the guide. Here is the link: https://example.com/guide\n\nLet me know if you have any questions!" }
                })
              });
            }
          }

        }
      }
    }

    // Meta requires a quick 200 OK response
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Server Error', { status: 500 });
  }
}
