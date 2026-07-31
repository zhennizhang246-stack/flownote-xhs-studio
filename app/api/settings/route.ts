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
};

export async function GET() {
  try {
    const db = getDb();
    const [settings] = await db.select().from(automationSettings).where(eq(automationSettings.id, 1)).limit(1);
    return Response.json({ settings: settings || defaults });
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
    if (!timePattern.test(publishTime) || !timePattern.test(researchTime)) {
      return Response.json({ error: "时间格式无效" }, { status: 400 });
    }
    const values = {
      id: 1,
      timezone: "Asia/Shanghai",
      publishTime,
      publishCadenceDays: cadence,
      researchTime,
      dailyResearchEnabled: payload.dailyResearchEnabled !== false,
      requireApproval: payload.requireApproval !== false,
      updatedAt: new Date().toISOString(),
    };
    const db = getDb();
    await db.insert(automationSettings).values(values).onConflictDoUpdate({
      target: automationSettings.id,
      set: values,
    });
    return Response.json({ settings: values });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存设置失败" }, { status: 500 });
  }
}
