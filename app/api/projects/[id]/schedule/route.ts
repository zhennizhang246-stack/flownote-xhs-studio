import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { projects } from "../../../../../db/schema";
import { apiError, requireAccountEmail } from "../../../../../lib/account";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerEmail = await requireAccountEmail();
    const { id } = await context.params;
    const projectId = Number(id);
    const { scheduledAt } = await request.json() as { scheduledAt?: string | null };
    if (!Number.isInteger(projectId) || projectId < 1) return Response.json({ error: "项目编号无效" }, { status: 400 });
    if (scheduledAt === null) {
      const db = getDb();
      const [existing] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).limit(1);
      if (!existing) return Response.json({ error: "项目不存在" }, { status: 404 });
      const [updated] = await db.update(projects).set({ scheduledAt: null, status: "approved" })
        .where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).returning();
      return Response.json({ project: updated });
    }
    if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
      return Response.json({ error: "请选择有效的发布日期与时间" }, { status: 400 });
    }
    const db = getDb();
    const [existing] = await db.select().from(projects).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).limit(1);
    if (!existing) return Response.json({ error: "项目不存在" }, { status: 404 });
    if (!["approved", "scheduled"].includes(existing.status)) {
      return Response.json({ error: "请先保存并人工确认封面与文案，再加入发布日历" }, { status: 409 });
    }
    const [updated] = await db.update(projects).set({
      scheduledAt: new Date(scheduledAt).toISOString(),
      status: "scheduled",
    }).where(and(eq(projects.id, projectId), eq(projects.ownerEmail, ownerEmail))).returning();
    return Response.json({ project: updated });
  } catch (error) {
    return apiError(error, "排期保存失败");
  }
}
