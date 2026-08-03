import { env } from "cloudflare:workers";
import {
  collectBrowserResearch,
  collectDailyResearch,
  listResearch,
  type BrowserResearchCandidate,
  type ResearchRuntimeEnv,
} from "../../../lib/research";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { researchReferences } from "../../../db/schema";
import { apiError, canClaimLegacyData, requireAccountEmail } from "../../../lib/account";

export async function GET() {
  try {
    const ownerEmail = await requireAccountEmail();
    if (canClaimLegacyData(ownerEmail)) {
      await getDb().update(researchReferences).set({ ownerEmail }).where(eq(researchReferences.ownerEmail, ""));
    }
    return Response.json({ references: await listResearch(env as unknown as ResearchRuntimeEnv, ownerEmail) });
  } catch (error) {
    return apiError(error, "读取室内设计引流笔记失败");
  }
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const payload = await request.json().catch(() => ({})) as {
      force?: boolean;
      browserCandidates?: BrowserResearchCandidate[];
    };
    const runtime = env as unknown as ResearchRuntimeEnv;
    const references = Array.isArray(payload.browserCandidates) && payload.browserCandidates.length
      ? await collectBrowserResearch(runtime, ownerEmail, payload.browserCandidates, payload.force === true)
      : await collectDailyResearch(runtime, ownerEmail, payload.force === true);
    return Response.json({ references });
  } catch (error) {
    return apiError(error, "引流笔记收集失败");
  }
}
