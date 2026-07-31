import { env } from "cloudflare:workers";
import { publishDueProjects, publishProjectOfficial, type OfficialPublishEnv } from "../../../../lib/official-publish";
import { apiError, requireAccountEmail } from "../../../../lib/account";

export async function POST(request: Request) {
  try {
    const ownerEmail = await requireAccountEmail();
    const payload = await request.json() as { projectId?: number; due?: boolean };
    const runtime = env as unknown as OfficialPublishEnv;
    if (payload.due) {
      const results = await publishDueProjects(runtime);
      return Response.json({ results });
    }
    const projectId = Number(payload.projectId);
    if (!Number.isInteger(projectId) || projectId < 1) {
      return Response.json({ error: "项目编号无效" }, { status: 400 });
    }
    const result = await publishProjectOfficial(runtime, ownerEmail, projectId);
    return Response.json({ result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "官方接口提交失败";
    const status = /尚未完成授权配置/.test(message) ? 503 : /必须先人工确认|尚未保存/.test(message) ? 409 : 500;
    if (status === 500) return apiError(error, "官方接口提交失败");
    return Response.json({ error: message }, { status });
  }
}
