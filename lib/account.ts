import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../app/chatgpt-auth";
import { getDb } from "../db";
import { xhsWorkspaceLinks } from "../db/schema";

export class AuthenticationRequiredError extends Error {}

type RuntimeEnv = { PRIMARY_OWNER_EMAIL?: string };

export async function requireRawAccountEmail() {
  const user = await getChatGPTUser();
  if (!user?.email) throw new AuthenticationRequiredError("请先登录 ChatGPT 账户");
  return user.email.trim().toLowerCase().slice(0, 320);
}

export async function requireAccountEmail() {
  const userEmail = await requireRawAccountEmail();
  const [link] = await getDb().select({ workspaceKey: xhsWorkspaceLinks.workspaceKey })
    .from(xhsWorkspaceLinks).where(eq(xhsWorkspaceLinks.userEmail, userEmail)).limit(1);
  return link?.workspaceKey || userEmail;
}

export function canClaimLegacyData(email: string) {
  const runtime = env as unknown as RuntimeEnv;
  return Boolean(runtime.PRIMARY_OWNER_EMAIL && runtime.PRIMARY_OWNER_EMAIL.trim().toLowerCase() === email);
}

export function apiError(error: unknown, fallback: string) {
  if (error instanceof AuthenticationRequiredError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}
