import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { automationSettings } from "../../../db/schema";

const defaults = {
  id: 1,
  timezone: "Asia/Shanghai",
  publishTime: "12:00",
  publishCadenceDays: 3,
  researchTime: "09:00",
  dailyResearchEnabled: true,
  requireApproval: true,
  publishMode: "manual",
};

type RuntimeEnv = {
  XHS_OFFICIAL_PUBLISH_ENDPOINT?: string;
  XHS_OFFICIAL_PUBLISH_TOKEN?: string;
};

function officialApiConnected() {
  const runtime = env as unknown as RuntimeEnv;
  try {
    const endpoint = new URL(runtime.XHS_OFFICIAL_PUBLISH_ENDPOINT || "");
    return Boolean(
      endpoint.protocol === "https:"
      && (endpoint.hostname === "xiaohongshu.com" || endpoint.hostname.endsWith(".xiaohongshu.com"))
      && runtime.XHS_OFFICIAL_PUBLISH_TOKEN,
    );
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const db = getDb();
    const [settings] = await db.select().from(automationSettings).where(eq(automationSettings.id, 1)).limit(1);
    return Response.json({ settings: { ...(settings || defaults), officialApiConnected: officialApiConnected() } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取设置失败" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json() as Partial<typeof defaults>;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const publishTime = String(payload.publishTime || defaults.publishTime);
    const researchTime = String(payload.researchTime || defaults.researchTime);
    const cadence = Math.min(30, Math.max(1, Number(payload.publishCadenceDays || defaults.publishCadenceDays)));
    const requestedMode = payload.publishMode === "official_api" ? "official_api" : "manual";
    if (!timePattern.test(publishTime) || !timePattern.test(researchTime)) {
      return Response.json({ error: "时间格式无效" }, { status: 400 });
    }
    if (requestedMode === "official_api" && !officialApiConnected()) {
      return Response.json({
        error: "尚未获得小红书官方发布 API 授权，自动发布不能启用；人工发布仍可正常使用",
      }, { status: 409 });
    }
    const values = {
      id: 1,
      timezone: "Asia/Shanghai",
      publishTime,
      publishCadenceDays: cadence,
      researchTime,
      dailyResearchEnabled: payload.dailyResearchEnabled !== false,
      requireApproval: payload.requireApproval !== false,
      publishMode: requestedMode,
      updatedAt: new Date().toISOString(),
    };
    const db = getDb();
    await db.insert(automationSettings).values(values).onConflictDoUpdate({
      target: automationSettings.id,
      set: values,
    });
    return Response.json({ settings: { ...values, officialApiConnected: officialApiConnected() } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存设置失败" }, { status: 500 });
  }
}
