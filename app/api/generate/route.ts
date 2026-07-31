import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects } from "../../../db/schema";
type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket; OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
type GeneratedDraft = { title:string; coverTitle:string; coverSubtitle:string; body:string; tags:string[]; highlights:string[]; riskNotes:string[]; coverIndex:number; mode:string };
function outputText(payload: Record<string, unknown>) { const output = Array.isArray(payload.output) ? payload.output : []; return output.flatMap((item) => { const content = item && typeof item === "object" && Array.isArray((item as {content?:unknown[]}).content) ? (item as {content:Array<{text?:string}>}).content : []; return content.map((part) => part.text || ""); }).join("\n"); }
function parseDraft(text: string): GeneratedDraft { const start=text.indexOf("{"); const end=text.lastIndexOf("}"); if(start<0||end<=start) throw new Error("AI 未返回可解析的文案"); return JSON.parse(text.slice(start,end+1)) as GeneratedDraft; }
export async function POST(request: Request) {
  try {
    const { projectId } = await request.json() as { projectId?: number }; if (!projectId) return Response.json({ error:"缺少项目编号" },{status:400});
    const runtime=env as unknown as RuntimeEnv; if(!runtime.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用"); if(!runtime.OPENAI_API_KEY?.startsWith("sk-")) return Response.json({error:"AI 密钥尚未连接"},{status:503});
    const db=getDb(); const [project]=await db.select().from(projects).where(eq(projects.id,projectId)).limit(1); if(!project) return Response.json({error:"项目不存在"},{status:404});
    const images=await db.select().from(projectImages).where(eq(projectImages.projectId,projectId)); if(!images.length) return Response.json({error:"项目没有图片"},{status:400});
    const content:Array<Record<string,unknown>>=[{type:"input_text",text:"你是个人室内设计工作室的高级内容秘书。必须依据上传的项目实景图生成小红书封面与原创文案。先识别空间类型、材质、灯光、动线、功能和画面情绪，再选择最适合封面的图片序号。只借鉴高互动设计项目笔记的结构，不复制原句，不虚构地点、面积、客户身份、材料品牌或完工事实。只返回 JSON，字段为 title, coverTitle, coverSubtitle, body, tags, highlights, riskNotes, coverIndex。项目事实："+JSON.stringify(project)}];
    for(const image of images.sort((a,b)=>a.sortOrder-b.sortOrder).slice(0,8)){ const object=await runtime.PROJECT_MEDIA.get(image.objectKey); if(!object) continue; const bytes=new Uint8Array(await object.arrayBuffer()); let binary=""; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000)); content.push({type:"input_image",image_url:`data:${image.contentType};base64,${btoa(binary)}`,detail:"auto"}); }
    const apiResponse=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${runtime.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:runtime.OPENAI_MODEL||"gpt-5.6-luna",input:[{role:"user",content}],max_output_tokens:2200})});
    if(!apiResponse.ok){if(apiResponse.status===401) throw new Error("AI 密钥无效或已失效"); throw new Error(`AI 服务暂不可用（${apiResponse.status}）`);} const responsePayload=await apiResponse.json() as Record<string,unknown>; const draft=parseDraft(outputText(responsePayload)); draft.mode="AI 多图分析"; draft.coverIndex=Math.max(0,Number(draft.coverIndex||0)); await db.update(projects).set({status:"drafted",draftJson:JSON.stringify(draft)}).where(eq(projects.id,projectId)); return Response.json({draft});
  } catch(error){return Response.json({error:error instanceof Error?error.message:"生成失败"},{status:500});}
}
