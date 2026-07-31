import { env } from "cloudflare:workers";
import { collectDailyResearch, listResearch, type ResearchRuntimeEnv } from "../../../lib/research";

export async function GET() {
  try {
    return Response.json({ references: await listResearch(env as unknown as ResearchRuntimeEnv) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取流量参考失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as { force?: boolean };
    return Response.json({ references: await collectDailyResearch(env as unknown as ResearchRuntimeEnv, payload.force === true) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "每日研究失败" }, { status: 500 });
  }
}
