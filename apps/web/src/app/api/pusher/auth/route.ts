import { NextResponse } from 'next/server';
import { authorizePusherChannel } from '@tyrerepair/realtime';
import { adminAuthErrorResponse, verifyAdminToken } from '@/lib/admin/auth';

export const runtime = 'nodejs';

interface AuthErrorResponse {
  error: string;
}

interface AuthSuccessResponse {
  auth: string;
}

const ADMIN_PRIVATE_CHANNELS = ['private-admin', 'private-visitors', 'private-pricing'];

function extractBearer(req: Request): string | null {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function POST(req: Request): Promise<NextResponse<AuthErrorResponse | AuthSuccessResponse>> {
  let socketId: string | null = null;
  let channelName: string | null = null;

  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as { socket_id?: unknown; channel_name?: unknown };
      socketId = typeof body.socket_id === 'string' ? body.socket_id : null;
      channelName = typeof body.channel_name === 'string' ? body.channel_name : null;
    } else {
      const form = await req.formData();
      const sid = form.get('socket_id');
      const ch = form.get('channel_name');
      socketId = typeof sid === 'string' ? sid : null;
      channelName = typeof ch === 'string' ? ch : null;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!socketId || !channelName) {
    return NextResponse.json(
      { error: 'Missing socket_id or channel_name' },
      { status: 400 },
    );
  }

  const isAdminChannel = ADMIN_PRIVATE_CHANNELS.includes(channelName);
  const isTrackingChannel = channelName.startsWith('tracking-');

  if (!isAdminChannel && !isTrackingChannel) {
    return NextResponse.json({ error: 'Channel not allowed' }, { status: 403 });
  }

  if (isAdminChannel) {
    const token = extractBearer(req);
    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }
    try {
      await verifyAdminToken(token);
    } catch (err) {
      const { status, body } = adminAuthErrorResponse(err);
      return NextResponse.json(body, { status });
    }
  }

  try {
    const authResponse = authorizePusherChannel(socketId, channelName);
    return NextResponse.json(authResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pusher auth failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
