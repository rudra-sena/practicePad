# Mastercraft

An application workspace for MBA and master's applicants. The applicant's own Claude (connected through MCP) researches schools, extracts stories from a CV, asks short questions, plans essay outlines, reviews drafts and runs a final check per school. Mastercraft has no AI inside: it stores, organises and keeps everything live.

## Try it
- Demo login: `demo` / `mastercraft` (use "Reset demo" in the top bar to restore the sample data)
- Or create your own account and connect your Claude from **Connect Claude**.

## Connect Claude (MCP)
1. Log in, open **Connect Claude** and copy your private link.
2. In claude.ai: Settings, then Connectors, then **Add custom connector**. Name it Mastercraft, paste the link, click Add.
3. In a new chat, switch Mastercraft on, then ask anything starting with "Using Mastercraft…". Every screen shows a ready prompt to copy.

## MCP tools
get_overview, add_school, update_school, get_profile, save_profile, save_story, update_story, save_answers, get_essay, save_outline, save_review, get_school_application, save_school_check, get_recommendation.

There is deliberately no tool that writes essay or recommendation text.

## Tech
Next.js on Vercel, Postgres (Neon). MCP server at `/api/mcp/<key>` (Streamable HTTP, stateless). No AI keys anywhere.
