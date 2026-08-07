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
    if (!runtime.PROJECT_MEDIA) return Response.json({ error: "字体存储暂不可用" }, { status: 503 });
    const form = await request.formData();
    const font = form.get("font");
    if (!(font instanceof File)) return Response.json({ error: "请选择字体文件" }, { status: 400 });
    if (!/\.(?:woff2?|ttf|otf)$/i.test(font.name) || font.size > 8 * 1024 * 1024) {
      return Response.json({ error: "仅支持 8MB 以内的 WOFF、WOFF2、TTF 或 OTF 字体" }, { status: 400 });
    }
    const prefix = await ownerPrefix(owner);
    const id = `${prefix}-${crypto.randomUUID()}`;
    const objectKey = `cover-fonts/${prefix}/${id}`;
    const contentType = font.type || "application/octet-stream";
    await runtime.PROJECT_MEDIA.put(objectKey, font.stream(), {
      httpMetadata: { contentType },
      customMetadata: { originalName: font.name.slice(0, 120) },
    });
    return Response.json({ url: `/api/fonts/${id}`, name: font.name.slice(0, 120) });
  } catch (error) {
    return apiError(error, "字体上传失败");
  }
}
