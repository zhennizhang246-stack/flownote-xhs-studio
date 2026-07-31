import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accountAutomationSettings, automationSettings } from "../../../db/schema";
import { apiError, canClaimLegacyData, requireAccountEmail } from "../../../lib/account";

const defaults = {
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

function officialApiConnected(ownerEmail: string) {
  const runtime = env as unknown as RuntimeEnv;
  try {
    const endpoint = new URL(runtime.XHS_OFFICIAL_PUBLISH_ENDPOINT || "");
    return Boolean(
      endpoint.protocol === "https:"
      && (endpoint.hostname === "xiaohongshu.com" || endpoint.hostname.endsWith(".xiaohongshu.com"))
      && runtime.XHS_OFFICIAL_PUBLISH_TOKEN,
    ) && canClaimLegacyData(ownerEmail);
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    const ownerEmail = await requireAccountEmail();
    const db = getDb();
    let [settings] = await db.select().from(accountAutomationSettings).where(eq(accountAutomationSettings.ownerEmail, ownerEmail)).limit(1);
    if (!settings && canClaimLegacyData(ownerEmail)) {
      const [legacy] = await db.select().from(automationSettings).where(eq(automationSettings.id, 1)).limit(1);
      if (legacy) {
        [settings] = await db.insert(accountAutomationSettings).values({
          ownerEmail,
          timezone: legacy.timezone,
          publishTime: legacy.publishTime,
          publishCadenceDays: legacy.publishCadenceDays,
          researchTime: legacy.researchTime,
          dailyResearchEnabled: legacy.dailyResearchEnabled,
          requireApproval: legacy.requireApproval,
          publishMode: legacy.publishMode,
          updatedAt: legacy.updatedAt,
        }).returning();
      }
    }
    return Response.json({ settings: { ...(settings || defaults), officialApiConnected: officialApiConnected(ownerEmail) } });
  } catch (error) {
    return apiError(error, "读取设置失败");
  }
}

export async function PUT(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const payload = await request.json() as Partial<typeof defaults>;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const publishTime = String(payload.publishTime || defaults.publishTime);
    const researchTime = String(payload.researchTime || defaults.researchTime);
    const cadence = Math.min(30, Math.max(1, Number(payload.publishCadenceDays || defaults.publishCadenceDays)));
    const requestedMode = payload.publishMode === "official_api" ? "official_api" : "manual";
    if (!timePattern.test(publishTime) || !timePattern.test(researchTime)) {
      return Response.json({ error: "时间格式无效" }, { status: 400 });
    }
    if (requestedMode === "official_api" && !officialApiConnected(ownerEmail)) {
      return Response.json({
        error: "尚未获得小红书官方发布 API 授权，自动发布不能启用；人工发布仍可正常使用",
      }, { status: 409 });
    }
    const values = {
      ownerEmail,
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
    await db.insert(accountAutomationSettings).values(values).onConflictDoUpdate({
      target: accountAutomationSettings.ownerEmail,
      set: values,
    });
    return Response.json({ settings: { ...values, officialApiConnected: officialApiConnected(ownerEmail) } });
  } catch (error) {
    return apiError(error, "保存设置失败");
  }
}
