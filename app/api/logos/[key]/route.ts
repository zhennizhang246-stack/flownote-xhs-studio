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
    const object = await (env as unknown as RuntimeEnv).PROJECT_MEDIA?.get(`cover-logos/${prefix}/${key}`);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "image/png", "cache-control": "private, max-age=86400" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
