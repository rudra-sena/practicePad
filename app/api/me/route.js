import { headers } from 'next/headers';
import { handler } from '@/lib/api';
import { json, baseUrlFromHeaders } from '@/lib/auth';

export const GET = handler(async ({ user }) => {
  const base = await baseUrlFromHeaders(await headers());
  return json({ name: user.name, username: user.username, is_demo: user.is_demo, claude_connected_at: user.claude_connected_at, claude_last_seen_at: user.claude_last_seen_at, base_url: base, mcp_url: `${base}/api/mcp/${user.api_key}` });
});
