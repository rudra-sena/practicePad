# PracticePad

Music teachers use their own Claude to create student practice plans. PracticePad saves them, lets the teacher edit them, and gives each student a live link to tick off practice. No AI runs inside the app: Claude does the thinking and writing through MCP, and PracticePad does the saving, editing, sharing and tracking.

## Try it
- Live app: (your Vercel URL)
- Demo login: `demo` / `practice123`, or create your own studio from the login page.

## Connect Claude (MCP)
1. Log in and open **Connect your Claude** on the dashboard. Copy your private MCP link.
2. In claude.ai, go to Settings, then Connectors, then **Add custom connector**. Name it PracticePad, paste the link, click Add.
3. In a new chat, switch PracticePad on in the tools menu.
4. Ask: "Using PracticePad, create a 3-week guitar plan for Kabir to play his first song."

## MCP tools
list_practice_plans, get_practice_plan, create_practice_plan, update_practice_plan, add_tasks, update_task, delete_task, delete_practice_plan.

## Tech
Next.js on Vercel, Postgres (Neon). MCP server at `/api/mcp/<key>` (Streamable HTTP, stateless). No AI keys anywhere.
