import { headers } from 'next/headers';
import { handler } from '@/lib/api';
import { json, baseUrlFromHeaders } from '@/lib/auth';

export const GET = handler(async ({ teacher }) => {
  const base = await baseUrlFromHeaders(await headers());
  return json({
    name: teacher.name,
    username: teacher.username,
    academy: teacher.academy,
    base_url: base,
    mcp_url: `${base}/api/mcp/${teacher.api_key}`,
  });
});
