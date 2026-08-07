import { env } from "cloudflare:workers";
import { requireAccountEmail } from "../../../../lib/account";

type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket };

async function ownerPrefix(owner: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(owner));
  return Array.from(new Uint8Array(digest)).slice(0, 10).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  try {
    const owner = await requireAccountEmail();
    const prefix = await ownerPrefix(owner);
    const { key } = await context.params;
    if (!new RegExp(`^${prefix}-[a-f0-9-]{36}$`, "i").test(key)) return new Response("Not found", { status: 404 });
    const runtime = env as unknown as RuntimeEnv;
    const object = await runtime.PROJECT_MEDIA?.get(`cover-fonts/${prefix}/${key}`);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType || "application/octet-stream",
        "cache-control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
