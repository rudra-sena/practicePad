// Mastercraft MCP server (Streamable HTTP, stateless, JSON responses).
// Each applicant has a private URL: /api/mcp/<their key>.
import { userByKey, baseUrlFromHeaders } from '@/lib/auth';
import { AppError, markClaudeSeen } from '@/lib/mc';
import { TOOLS, callTool } from '@/lib/mcp-tools';

export const dynamic = 'force-dynamic';

const SERVER_INFO = { name: 'mastercraft', title: 'Mastercraft', version: '1.0.0' };
const INSTRUCTIONS =
  'Mastercraft is the applicant\'s MBA and master\'s application workspace. You (Claude) do the thinking: research schools, ' +
  'extract stories from a CV, ask short questions, plan essay outlines and review drafts. Mastercraft stores everything and keeps it live. ' +
  'Mastercraft never writes essays or recommendation letters: outlines are bullet points, and the applicant writes the prose in the app. ' +
  'After saving something, share the link to it with the applicant.';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version',
};

function rpc(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } };
}

async function handleOne(msg, user, base) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return rpcError(msg?.id, -32600, 'Invalid request');
  }
  const isNotification = msg.id === undefined || msg.id === null;
  if (isNotification) return null;

  switch (msg.method) {
    case 'initialize':
      return rpc(msg.id, {
        protocolVersion: msg.params?.protocolVersion || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      return rpc(msg.id, {});
    case 'tools/list':
      return rpc(msg.id, { tools: TOOLS });
    case 'resources/list':
      return rpc(msg.id, { resources: [] });
    case 'prompts/list':
      return rpc(msg.id, { prompts: [] });
    case 'tools/call': {
      const name = msg.params?.name;
      if (!TOOLS.find((t) => t.name === name)) return rpcError(msg.id, -32602, `Unknown tool: ${name}`);
      try {
        const out = await callTool(name, msg.params?.arguments, user, base);
        return rpc(msg.id, { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }], structuredContent: out });
      } catch (e) {
        if (!(e instanceof AppError)) console.error(e);
        const text = e instanceof AppError ? e.message : 'Mastercraft hit an internal error. Please try again.';
        return rpc(msg.id, { content: [{ type: 'text', text }], isError: true });
      }
    }
    default:
      return rpcError(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}

export async function POST(req, { params }) {
  const { key } = await params;
  const user = await userByKey(key);
  if (!user) {
    return Response.json(rpcError(null, -32001, 'This Mastercraft MCP link is not valid. Copy it again from your dashboard.'), { status: 404, headers: CORS });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json(rpcError(null, -32700, 'Parse error'), { status: 400, headers: CORS });
  }
  await markClaudeSeen(user.id).catch(() => {});
  const base = await baseUrlFromHeaders(req.headers);
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map((m) => handleOne(m, user, base)))).filter(Boolean);
    if (!out.length) return new Response(null, { status: 202, headers: CORS });
    return Response.json(out, { headers: CORS });
  }
  const out = await handleOne(body, user, base);
  if (!out) return new Response(null, { status: 202, headers: CORS });
  return Response.json(out, { headers: CORS });
}

// This server does not open server-to-client streams.
export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { ...CORS, Allow: 'POST' } });
}

export async function DELETE() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
