import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { xhsWorkspaceLinks } from "../../../db/schema";
import { apiError, requireRawAccountEmail } from "../../../lib/account";

function normalizeProfileUrl(value: unknown) {
  const url = new URL(String(value || "").trim());
  if (!/(^|\.)xiaohongshu\.com$/i.test(url.hostname)) throw new Error("请输入小红书官方主页链接");
  const match = url.pathname.match(/^\/user\/profile\/([0-9a-z_-]{12,80})\/?$/i);
  if (!match) throw new Error("主页链接格式不正确，请复制小红书个人主页链接");
  return {
    profileUrl: `https://www.xiaohongshu.com/user/profile/${match[1]}`,
    workspaceKey: `xhs:${match[1].toLowerCase()}`,
  };
}

export async function GET() {
  try {
    const userEmail = await requireRawAccountEmail();
    const [link] = await getDb().select().from(xhsWorkspaceLinks)
      .where(eq(xhsWorkspaceLinks.userEmail, userEmail)).limit(1);
    return Response.json({ linked: Boolean(link), profileUrl: link?.profileUrl || "", workspaceKey: link?.workspaceKey || "" });
  } catch (error) {
    return apiError(error, "小红书工作区读取失败");
  }
}

export async function POST(request: Request) {
  try {
    const userEmail = await requireRawAccountEmail();
    const payload = await request.json() as { profileUrl?: string; bridgeConfirmed?: boolean };
    if (payload.bridgeConfirmed !== true) return Response.json({ error: "请先连接最新版 MJ 发布桥并登录小红书" }, { status: 409 });
    const values = normalizeProfileUrl(payload.profileUrl);
    const now = new Date().toISOString();
    const [link] = await getDb().insert(xhsWorkspaceLinks).values({ userEmail, ...values, updatedAt: now })
      .onConflictDoUpdate({ target: xhsWorkspaceLinks.userEmail, set: { ...values, updatedAt: now } }).returning();
    return Response.json({ linked: true, profileUrl: link.profileUrl, workspaceKey: link.workspaceKey });
  } catch (error) {
    return apiError(error, "小红书工作区绑定失败");
  }
}
