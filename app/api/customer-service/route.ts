import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { customerMessages } from "../../../db/schema";
import { apiError, canClaimLegacyData, requireAccountEmail } from "../../../lib/account";

const DEFAULT_REPLY = "感谢关注栖作设计✨ 方便说下项目城市、面积、空间类型和预计启动时间吗？我们会根据实际情况整理初步建议。";
const MANUAL_REVIEW_PATTERN = /微信|vx|电话|手机号|投诉|退款|维权|曝光|侵权|抄袭|骗子|垃圾|举报|差评/i;

function suggestedReply(message: string) {
  if (MANUAL_REVIEW_PATTERN.test(message)) {
    return "这条评论涉及联系方式、投诉或争议，请人工查看上下文后在小红书站内回复。";
  }
  if (/多少钱|价格|报价|费用|收费|预算/.test(message)) {
    return "感谢咨询✨ 设计费用会根据城市、面积、空间类型和服务范围综合评估，方便补充这些项目信息吗？";
  }
  if (/喜欢|好看|漂亮|有质感|很棒|不错|高级/.test(message)) {
    return "谢谢喜欢与认可✨ 我们会继续分享真实项目里的空间细节和设计思考。";
  }
  if (/材料|材质|木头|灯光|色号|品牌/.test(message)) {
    return "感谢关注这个细节✨ 不同项目会结合现场条件和预算选材，方便说下你想了解的是哪个空间或材质吗？";
  }
  return DEFAULT_REPLY;
}

function withEligibility<T extends { message: string }>(item: T) {
  return { ...item, autoReplyEligible: !MANUAL_REVIEW_PATTERN.test(item.message) };
}

export async function GET() {
  try {
    const ownerEmail = await requireAccountEmail();
    const db = getDb();
    if (canClaimLegacyData(ownerEmail)) await db.update(customerMessages).set({ ownerEmail }).where(eq(customerMessages.ownerEmail, ""));
    const messages = await db.select().from(customerMessages).where(eq(customerMessages.ownerEmail, ownerEmail)).orderBy(desc(customerMessages.createdAt)).limit(100);
    return Response.json({ messages: messages.map(withEligibility), integration: "browser_comment_bridge" });
  } catch (error) {
    return apiError(error, "读取客服留言失败");
  }
}

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const payload = await request.json() as {
      senderName?: string;
      message?: string;
      sourceUrl?: string;
      comments?: Array<{ senderName?: string; message?: string; sourceUrl?: string }>;
    };
    if (Array.isArray(payload.comments)) {
      const db = getDb();
      const saved = [];
      for (const candidate of payload.comments.slice(0, 50)) {
        const message = String(candidate.message || "").trim().slice(0, 1000);
        const senderName = String(candidate.senderName || "小红书访客").trim().slice(0, 80) || "小红书访客";
        const sourceUrl = String(candidate.sourceUrl || "").trim().slice(0, 500);
        if (!message || !sourceUrl) continue;
        const [existing] = await db.select().from(customerMessages).where(and(
          eq(customerMessages.ownerEmail, ownerEmail),
          eq(customerMessages.senderName, senderName),
          eq(customerMessages.message, message),
          eq(customerMessages.sourceUrl, sourceUrl),
        )).limit(1);
        if (existing) {
          saved.push(withEligibility(existing));
          continue;
        }
        const [created] = await db.insert(customerMessages).values({
          ownerEmail,
          senderName,
          message,
          sourceUrl,
          suggestedReply: suggestedReply(message),
        }).returning();
        saved.push(withEligibility(created));
      }
      return Response.json({ messages: saved }, { status: 201 });
    }
    const message = String(payload.message || "").trim().slice(0, 1000);
    if (!message) return Response.json({ error: "请填写客户留言" }, { status: 400 });
    const db = getDb();
    const [saved] = await db.insert(customerMessages).values({
      ownerEmail,
      senderName: String(payload.senderName || "小红书访客").trim().slice(0, 80) || "小红书访客",
      message,
      sourceUrl: String(payload.sourceUrl || "").trim().slice(0, 500),
      suggestedReply: suggestedReply(message),
    }).returning();
    return Response.json({ message: withEligibility(saved) }, { status: 201 });
  } catch (error) {
    return apiError(error, "保存客服留言失败");
  }
}

export async function PATCH(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const payload = await request.json() as { id?: number; status?: string };
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "留言编号无效" }, { status: 400 });
    const status = payload.status === "replied" ? "replied" : "pending";
    const db = getDb();
    const [updated] = await db.update(customerMessages).set({
      status,
      repliedAt: status === "replied" ? new Date().toISOString() : null,
    }).where(and(eq(customerMessages.id, id), eq(customerMessages.ownerEmail, ownerEmail))).returning();
    if (!updated) return Response.json({ error: "留言不存在" }, { status: 404 });
    return Response.json({ message: withEligibility(updated) });
  } catch (error) {
    return apiError(error, "客服状态更新失败");
  }
}
