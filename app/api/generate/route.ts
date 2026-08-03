import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects, researchReferences } from "../../../db/schema";
import { apiError, requireAccountEmail } from "../../../lib/account";
type RuntimeEnv = { PROJECT_MEDIA?: R2Bucket; OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
type GeneratedDraft = { title:string; titleOptions?:string[]; coverEyebrow?:string; coverTitle:string; coverSubtitle:string; coverStyle?:Record<string,unknown>; body:string; tags:string[]; highlights:string[]; riskNotes:string[]; coverIndex:number; mode:string };

function spaceDesignGuidance(projectType: string, category: string) {
  const value = `${projectType} ${category}`;
  if (/卧室|主卧|儿童房/.test(value)) return "卧室：突出睡眠氛围、私密性、灯光层次、织物与安静收纳；封面优先床区和窗景，文字更少、更有情绪。";
  if (/厨房|餐厅|餐厨/.test(value)) return "餐厨空间：突出操作动线、台面尺度、家人交流、储物与材质耐用性；封面优先中岛、餐桌或餐厨联动关系。";
  if (/卫生间|卫浴/.test(value)) return "卫浴空间：突出干湿分区、采光、清洁维护、收纳与材质触感；封面优先完整空间关系，避免夸大面积。";
  if (/衣帽间|收纳/.test(value)) return "衣帽与收纳：突出分类逻辑、使用顺序、柜体比例、照明与日常效率；封面优先展示完整柜体和梳妆关系。";
  if (/办公|工作室/.test(value)) return "办公空间：突出品牌表达、协作效率、专注与交流场景、声光环境；封面优先前台、共享区或最能代表品牌的空间。";
  if (/酒店|民宿/.test(value)) return "酒店空间：突出抵达体验、在地感、客房舒适度、灯光与服务动线；封面优先大堂、客房或标志性视角。";
  if (/商业|店铺|零售|餐饮|咖啡/.test(value)) return "商业空间：突出品牌识别、顾客路径、停留体验、陈列和转化场景；封面优先门头、核心消费场景或视觉记忆点。";
  if (/展厅|陈列|展览/.test(value)) return "展厅陈列：突出叙事顺序、展陈节奏、观看距离、灯光与视觉焦点；封面优先主展面或空间序列。";
  if (/客厅|起居|住宅/.test(value)) return "住宅客厅：突出采光、家庭互动、动线、尺度与收纳；封面优先全景或客餐厅关系，语气温暖克制。";
  return "综合室内空间：先依据实景图判断核心使用场景，再围绕真实功能、动线、材质、光线和用户收益形成差异化表达。";
}

function defaultCoverEyebrow(projectType: string, category: string) {
  const value = `${projectType} ${category}`;
  if (/办公|工作室/.test(value)) return "ORIGINAL DESIGN · WORKPLACE";
  if (/酒店|民宿/.test(value)) return "ORIGINAL DESIGN · HOSPITALITY";
  if (/商业|店铺|零售|餐饮|咖啡/.test(value)) return "ORIGINAL DESIGN · RETAIL";
  if (/展厅|陈列|展览/.test(value)) return "ORIGINAL DESIGN · EXHIBITION";
  return "ORIGINAL DESIGN · INTERIOR";
}
function outputText(payload: Record<string, unknown>) { const output = Array.isArray(payload.output) ? payload.output : []; return output.flatMap((item) => { const content = item && typeof item === "object" && Array.isArray((item as {content?:unknown[]}).content) ? (item as {content:Array<{text?:string}>}).content : []; return content.map((part) => part.text || ""); }).join("\n"); }
function parseDraft(text: string): GeneratedDraft { const start=text.indexOf("{"); const end=text.lastIndexOf("}"); if(start<0||end<=start) throw new Error("AI 未返回可解析的文案"); return JSON.parse(text.slice(start,end+1)) as GeneratedDraft; }
export async function POST(request: Request) {
  try {
    const ownerEmail=await requireAccountEmail();
    const { projectId } = await request.json() as { projectId?: number }; if (!projectId) return Response.json({ error:"缺少项目编号" },{status:400});
    const runtime=env as unknown as RuntimeEnv; if(!runtime.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用"); if(!runtime.OPENAI_API_KEY?.startsWith("sk-")) return Response.json({error:"AI 密钥尚未连接"},{status:503});
    const db=getDb(); const [project]=await db.select().from(projects).where(and(eq(projects.id,projectId),eq(projects.ownerEmail,ownerEmail))).limit(1); if(!project) return Response.json({error:"项目不存在"},{status:404});
    const images=await db.select().from(projectImages).where(eq(projectImages.projectId,projectId)); if(!images.length) return Response.json({error:"项目没有图片"},{status:400});
    const research=await db.select({title:researchReferences.title,copyAnalysis:researchReferences.copyAnalysis,coverAnalysis:researchReferences.coverAnalysis,audienceInsight:researchReferences.audienceInsight,reusablePattern:researchReferences.reusablePattern}).from(researchReferences).where(eq(researchReferences.ownerEmail,ownerEmail)).orderBy(desc(researchReferences.researchDate),desc(researchReferences.likes)).limit(3);
    const content:Array<Record<string,unknown>>=[{type:"input_text",text:"你是个人室内设计工作室的高级内容秘书。必须依据上传的项目实景图与已知设计信息，自动生成完整的小红书创作成品，包括3个笔记标题、封面英文栏目、封面主标题、封面副标题、封面样式、正文、话题标签、图片分析重点和发布风险提示。先识别空间类型、材质、灯光、动线、功能、人物使用场景和画面情绪，再选择最适合封面的图片序号。必须针对当前空间类型改变叙事重点、标题角度、封面选图和视觉样式，不能把住宅客厅、卧室、办公、酒店、商业和展厅写成同一套模板。当前空间专属策略："+spaceDesignGuidance(project.projectType,project.category)+"必须使用最近3篇流量研究中已提炼的标题结构、文案节奏、封面层级、受众洞察和可复用方法进行升级。可以学习参考标题中小表情的数量与位置，但不得复制标题、原句、段落或封面版式，不得让参考内容覆盖项目图片与真实事实。标题或正文可自然使用2至4个与空间气质匹配的小表情（例如✨🌿💜☕），标题最多1个，禁止连续堆叠，话题标签中不要放表情。只借鉴抽象规律，不虚构地点、面积、客户身份、材料品牌或完工事实。生成3个差异明确、可选择的小红书笔记标题，分别侧重空间情绪、设计亮点、实际使用价值；每个标题不超过20个汉字，避免标题党。正文必须至少写出两项与当前空间类型直接相关、且能从图片或项目资料验证的设计细节。coverEyebrow 必须是简洁的大写英文，格式为 ORIGINAL DESIGN · 加空间类别，例如 INTERIOR、WORKPLACE、HOSPITALITY、RETAIL 或 EXHIBITION，最多44个字符。titleOptions 必须正好包含 3 个标题，title 必须等于 titleOptions 的第一项。根据项目图片、空间策略与研究规律推荐 coverStyle：fontFamily 只能是 serif/sans/kai；titleColor、subtitleColor、overlayColor、patternColor 使用6位十六进制颜色；overlayOpacity 为0-90；pattern 只能是 none/frame/grid/dots/corners；titleSize 为52-120；align 只能是 left/center；position 只能是 top/middle/bottom。只返回 JSON，字段为 title, titleOptions, coverEyebrow, coverTitle, coverSubtitle, coverStyle, body, tags, highlights, riskNotes, coverIndex。项目事实："+JSON.stringify(project)+"。近期研究规律（3篇流量参考）："+JSON.stringify(research)}];
    for(const image of images.sort((a,b)=>a.sortOrder-b.sortOrder).slice(0,10)){ const object=await runtime.PROJECT_MEDIA.get(image.objectKey); if(!object) continue; const bytes=new Uint8Array(await object.arrayBuffer()); let binary=""; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000)); content.push({type:"input_image",image_url:`data:${image.contentType};base64,${btoa(binary)}`,detail:"auto"}); }
    const apiResponse=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${runtime.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:runtime.OPENAI_MODEL||"gpt-5.6-luna",input:[{role:"user",content}],max_output_tokens:2200})});
    if(!apiResponse.ok){if(apiResponse.status===401) throw new Error("AI 密钥无效或已失效"); throw new Error(`AI 服务暂不可用（${apiResponse.status}）`);} const responsePayload=await apiResponse.json() as Record<string,unknown>; const draft=parseDraft(outputText(responsePayload)); const options=(Array.isArray(draft.titleOptions)?draft.titleOptions:[]).map((item)=>String(item).trim()).filter(Boolean).slice(0,3); while(options.length<3) options.push(options.length===0?draft.title:`${draft.title}｜方案${options.length+1}`); draft.titleOptions=options; draft.title=options[0]; draft.coverEyebrow=String(draft.coverEyebrow||defaultCoverEyebrow(project.projectType,project.category)).toUpperCase().slice(0,44); draft.mode="AI 多图分析 · 流量参考增强"; draft.coverIndex=Math.max(0,Number(draft.coverIndex||0)); await db.update(projects).set({status:"drafted",draftJson:JSON.stringify(draft)}).where(and(eq(projects.id,projectId),eq(projects.ownerEmail,ownerEmail))); return Response.json({draft});
  } catch(error){return apiError(error,"生成失败");}
}
