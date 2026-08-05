import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { accountDevices } from "../../../db/schema";
import { apiError, requireAccountEmail } from "../../../lib/account";

const MAX_ACCOUNT_DEVICES = 3;
const clean = (value: unknown, max: number) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

export async function GET() {
  try {
    const ownerEmail = await requireAccountEmail();
    const devices = await getDb().select().from(accountDevices)
      .where(eq(accountDevices.ownerEmail, ownerEmail))
      .orderBy(desc(accountDevices.lastSeenAt));
    return Response.json({ devices, limit: MAX_ACCOUNT_DEVICES });
  } catch (error) {
    return apiError(error, "设备列表读取失败");
  }
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const payload = await request.json() as { deviceKey?: string; deviceName?: string; bridgeConnected?: boolean };
    const deviceKey = clean(payload.deviceKey, 120);
    const deviceName = clean(payload.deviceName, 60) || "创作电脑";
    if (!/^[0-9a-z-]{16,120}$/i.test(deviceKey)) return Response.json({ error: "设备标识无效" }, { status: 400 });
    const db = getDb();
    const existing = await db.select().from(accountDevices).where(and(
      eq(accountDevices.ownerEmail, ownerEmail),
      eq(accountDevices.deviceKey, deviceKey),
    )).limit(1);
    const now = new Date().toISOString();
    if (existing[0]) {
      const [device] = await db.update(accountDevices).set({ deviceName, bridgeConnected: payload.bridgeConnected === true, lastSeenAt: now })
        .where(and(eq(accountDevices.ownerEmail, ownerEmail), eq(accountDevices.deviceKey, deviceKey))).returning();
      return Response.json({ device, limit: MAX_ACCOUNT_DEVICES });
    }
    const devices = await db.select({ id: accountDevices.id }).from(accountDevices).where(eq(accountDevices.ownerEmail, ownerEmail));
    if (devices.length >= MAX_ACCOUNT_DEVICES) {
      return Response.json({ error: "当前账户最多绑定 3 台电脑，请先移除不再使用的设备" }, { status: 409 });
    }
    const [device] = await db.insert(accountDevices).values({ ownerEmail, deviceKey, deviceName, bridgeConnected: payload.bridgeConnected === true, lastSeenAt: now }).returning();
    return Response.json({ device, limit: MAX_ACCOUNT_DEVICES }, { status: 201 });
  } catch (error) {
    return apiError(error, "设备绑定失败");
  }
}

export async function DELETE(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const deviceKey = clean(new URL(request.url).searchParams.get("deviceKey"), 120);
    if (!deviceKey) return Response.json({ error: "缺少设备标识" }, { status: 400 });
    await getDb().delete(accountDevices).where(and(eq(accountDevices.ownerEmail, ownerEmail), eq(accountDevices.deviceKey, deviceKey)));
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error, "设备移除失败");
  }
}
