import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { projectImages, projects } from "../../../../db/schema";
import { requireAccountEmail } from "../../../../lib/account";

type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const ownerEmail = await requireAccountEmail();
    const { id } = await context.params;
    const imageId = Number(id);
    if (!Number.isInteger(imageId) || imageId < 1) return new Response("Not found", { status: 404 });
    const db = getDb();
    const [image] = await db.select({
      id: projectImages.id,
      objectKey: projectImages.objectKey,
      contentType: projectImages.contentType,
    }).from(projectImages).innerJoin(projects, eq(projects.id, projectImages.projectId))
      .where(and(eq(projectImages.id, imageId), eq(projects.ownerEmail, ownerEmail))).limit(1);
    const runtime = env as unknown as RuntimeEnv;
    if (!image || !runtime.PROJECT_MEDIA) return new Response("Not found", { status: 404 });
    const object = await runtime.PROJECT_MEDIA.get(image.objectKey);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: { "content-type": image.contentType, "cache-control": "private, max-age=3600" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
