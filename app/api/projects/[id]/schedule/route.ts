import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { projects } from "../../../../../db/schema";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const projectId = Number(id);
    const { scheduledAt } = await request.json() as { scheduledAt?: string };
    if (!Number.isInteger(projectId) || projectId < 1) return Response.json({ error: "项目编号无效" }, { status: 400 });
    if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      return Response.json({ error: "请选择有效的发布日期与时间" }, { status: 400 });
    }
    const db = getDb();
    const [updated] = await db.update(projects).set({
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: "scheduled",
    }).where(eq(projects.id, projectId)).returning();
    if (!updated) return Response.json({ error: "项目不存在" }, { status: 404 });
    return Response.json({ project: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "排期保存失败" }, { status: 500 });
  }
}
