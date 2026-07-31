import { env } from "cloudflare:workers";
import {
  collectBrowserResearch,
  collectDailyResearch,
  listResearch,
  type BrowserResearchCandidate,
  type ResearchRuntimeEnv,
} from "../../../lib/research";

export async function GET() {
  try {
    return Response.json({ references: await listResearch(env as unknown as ResearchRuntimeEnv) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取流量参考失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({})) as {
      force?: boolean;
      browserCandidates?: BrowserResearchCandidate[];
    };
    const runtime = env as unknown as ResearchRuntimeEnv;
    const references = Array.isArray(payload.browserCandidates) && payload.browserCandidates.length
      ? await collectBrowserResearch(runtime, payload.browserCandidates, payload.force === true)
      : await collectDailyResearch(runtime, payload.force === true);
    return Response.json({ references });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "每日研究失败" }, { status: 500 });
  }
}
