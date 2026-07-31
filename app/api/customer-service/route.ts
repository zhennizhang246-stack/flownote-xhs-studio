import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { customerMessages } from "../../../db/schema";

const SAFE_REPLY = "您好，感谢关注栖作设计✨ 为了更准确了解需求，方便说下项目城市、面积、空间类型和预计启动时间吗？我会根据情况整理初步建议。";

export async function GET() {
  try {
    const db = getDb();
    const messages = await db.select().from(customerMessages).orderBy(desc(customerMessages.createdAt)).limit(100);
    return Response.json({ messages, integration: "manual_handoff" });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "读取客服留言失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { senderName?: string; message?: string; sourceUrl?: string };
    const message = String(payload.message || "").trim().slice(0, 1000);
    if (!message) return Response.json({ error: "请填写客户留言" }, { status: 400 });
    const db = getDb();
    const [saved] = await db.insert(customerMessages).values({
      senderName: String(payload.senderName || "小红书访客").trim().slice(0, 80) || "小红书访客",
      message,
      sourceUrl: String(payload.sourceUrl || "").trim().slice(0, 500),
      suggestedReply: SAFE_REPLY,
    }).returning();
    return Response.json({ message: saved }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "保存客服留言失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = await request.json() as { id?: number; status?: string };
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "留言编号无效" }, { status: 400 });
    const status = payload.status === "replied" ? "replied" : "pending";
    const db = getDb();
    const [updated] = await db.update(customerMessages).set({
      status,
      repliedAt: status === "replied" ? new Date().toISOString() : null,
    }).where(eq(customerMessages.id, id)).returning();
    if (!updated) return Response.json({ error: "留言不存在" }, { status: 404 });
    return Response.json({ message: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "客服状态更新失败" }, { status: 500 });
  }
}
