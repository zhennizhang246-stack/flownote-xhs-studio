import { env } from "cloudflare:workers";
import { apiError, requireAccountEmail } from "../../../lib/account";

type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket };

async function ownerPrefix(owner: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
  return Array.from(new Uint8Array(digest)).slice(0, 10).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  try {
    const owner = await requireAccountEmail();
    const runtime = env as unknown as RuntimeEnv;
    if (!runtime.PROJECT_MEDIA) return Response.json({ error: "Logo 存储暂不可用" }, { status: 503 });
    const form = await request.formData();
    const logo = form.get("logo");
    if (!(logo instanceof File)) return Response.json({ error: "请选择 Logo 图片" }, { status: 400 });
    if (!/\.(?:png|jpe?g|webp)$/i.test(logo.name) || logo.size > 5 * 1024 * 1024) {
      return Response.json({ error: "仅支持 5MB 以内的 PNG、JPG 或 WebP 图片" }, { status: 400 });
    }
    const prefix = await ownerPrefix(owner);
    const id = `${prefix}-${crypto.randomUUID()}`;
    await runtime.PROJECT_MEDIA.put(`cover-logos/${prefix}/${id}`, logo.stream(), {
      httpMetadata: { contentType: logo.type || "image/png" },
      customMetadata: { originalName: logo.name.slice(0, 120) },
    });
    return Response.json({ url: `/api/logos/${id}`, name: logo.name.slice(0, 120) });
  } catch (error) {
    return apiError(error, "Logo 图片上传失败");
  }
}
