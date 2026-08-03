import { env } from "cloudflare:workers";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects, researchReferences } from "../../../db/schema";
import { apiError, requireAccountEmail } from "../../../lib/account";
type RuntimeEnv = {
  PROJECT_MEDIA?: R2Bucket;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
  DOUBAO_API_KEY?: string;
  DOUBAO_MODEL?: string;
};
type GeneratedDraft = { title:string; titleOptions?:string[]; coverEyebrow?:string; coverTitle:string; coverSubtitle:string; coverStyle?:Record<string,unknown>; body:string; tags:string[]; highlights:string[]; riskNotes:string[]; coverIndex:number; mode:string };

function spaceDesignGuidanceBase(projectType: string, category: string) {
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

function spaceDesignGuidance(projectType: string, category: string) {
  return `${spaceDesignGuidanceBase(projectType, category)} 每次生成都必须把3个标题方案、封面英文栏目、封面主标题、封面副标题、封面样式全部参数、正文和话题标签作为一个整体重新创作，不得沿用旧草稿或示例项目中的原值。coverStyle 还必须生成 titleOffsetX（-35至35）、titleOffsetY（-30至30）、titleDirection（horizontal 或 vertical）、patternOffsetX、patternOffsetY（-25至25）、patternScale（50至160）、eyebrowX（2至50）、eyebrowY（2至35）、eyebrowSize（16至48）、eyebrowOpacity（10至100）、showEyebrowLine（布尔值）、subtitleSize（18至54）、subtitleOffsetX（-30至30）和 subtitleOffsetY（-20至25），让主标题、装饰图案、英文栏目和副标题具有适合画面的初始大小、位置与透明度。正文从两种结构中选择更适合当前项目的一种：A. 先用一段说明设计核心，再用3至5段“💧 小标题：照片可验证的设计细节”展开；B. 用有辨识度的项目标题开场，再以3至5段编辑式叙事描述空间概念、真实场景、材质、动线与体验，可在结尾加入一句简短英文概念。无论选择哪种结构，所有事实都必须来自上传照片和已知设计信息；看不清或未提供的内容不得猜测。`;
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

function draftCopy(value: string) {
  try {
    const draft = JSON.parse(value || "{}") as Partial<GeneratedDraft>;
    return {
      titleOptions: Array.isArray(draft.titleOptions) ? draft.titleOptions.map(String).slice(0, 3) : [String(draft.title || "")],
      coverTitle: String(draft.coverTitle || ""),
      coverSubtitle: String(draft.coverSubtitle || ""),
      body: String(draft.body || ""),
    };
  } catch {
    return { titleOptions: [], coverTitle: "", coverSubtitle: "", body: "" };
  }
}

function normalizedCopy(value: unknown) {
  return String(value || "").replace(/[\s，。！？、；：,.!?;:'"“”‘’｜|·—_-]+/g, "").toLowerCase();
}

function duplicateFragments(draft: GeneratedDraft, existing: ReturnType<typeof draftCopy>[]) {
  const priorShort = new Set(existing.flatMap((item) => [...item.titleOptions, item.coverTitle, item.coverSubtitle]).map(normalizedCopy).filter((item) => item.length >= 4));
  const duplicates = [...(draft.titleOptions || []), draft.title, draft.coverTitle, draft.coverSubtitle]
    .map(normalizedCopy).filter((item) => item.length >= 4 && priorShort.has(item));
  const priorBodies = existing.map((item) => normalizedCopy(item.body)).filter(Boolean);
  const sentences = String(draft.body || "").split(/[。！？\n]+/).map(normalizedCopy).filter((item) => item.length >= 14);
  for (const sentence of sentences) {
    const sample = sentence.slice(0, Math.min(24, sentence.length));
    if (priorBodies.some((body) => body.includes(sample))) duplicates.push(sample);
  }
  return [...new Set(duplicates)].slice(0, 8);
}

async function requestDraft(runtime: RuntimeEnv, content: Array<Record<string, unknown>>, avoid: string[] = []) {
  const requestContent = avoid.length
    ? content.map((item, index) => index === 0 ? { ...item, text: `${String(item.text || "")}。上一次生成仍与已有项目重复，以下文字片段绝对禁止再次出现：${JSON.stringify(avoid)}。必须彻底改换标题角度、主副标题措辞、段落开头、叙事顺序和结尾表达。` } : item)
    : content;
  const providers = [
    runtime.OPENAI_API_KEY?.startsWith("sk-") ? {
      name: "OpenAI",
      endpoint: "https://api.openai.com/v1/responses",
      key: runtime.OPENAI_API_KEY,
      model: runtime.OPENAI_MODEL || "gpt-5.6-luna",
    } : null,
    runtime.DOUBAO_API_KEY ? {
      name: "豆包",
      endpoint: "https://ark.cn-beijing.volces.com/api/v3/responses",
      key: runtime.DOUBAO_API_KEY,
      model: runtime.DOUBAO_MODEL || "doubao-seed-2-0-lite-260215",
    } : null,
  ].filter(Boolean) as Array<{ name: string; endpoint: string; key: string; model: string }>;
  if (!providers.length) throw new Error("尚未配置可用的 OpenAI 或豆包 API 密钥");
  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const response=await fetch(provider.endpoint,{method:"POST",headers:{authorization:`Bearer ${provider.key}`,"content-type":"application/json"},body:JSON.stringify({model:provider.model,input:[{role:"user",content:requestContent}],max_output_tokens:2600})});
      if(!response.ok){const detail=await response.text().catch(()=>""); failures.push(`${provider.name} ${response.status}${detail ? `：${detail.slice(0,180)}` : ""}`); continue;}
      const payload=await response.json() as Record<string,unknown>;
      return { draft: parseDraft(outputText(payload)), provider: provider.name };
    } catch (error) {
      failures.push(`${provider.name}：${error instanceof Error ? error.message : "调用失败"}`);
    }
  }
  throw new Error(`AI 通道均不可用：${failures.join("；")}`);
}
export async function POST(request: Request) {
  try {
    const ownerEmail=await requireAccountEmail();
    const { projectId } = await request.json() as { projectId?: number }; if (!projectId) return Response.json({ error:"缺少项目编号" },{status:400});
    const runtime=env as unknown as RuntimeEnv; if(!runtime.PROJECT_MEDIA) throw new Error("项目图片存储暂不可用"); if(!runtime.OPENAI_API_KEY?.startsWith("sk-")&&!runtime.DOUBAO_API_KEY) return Response.json({error:"尚未连接 OpenAI 或豆包 AI 密钥"},{status:503});
    const db=getDb(); const [project]=await db.select().from(projects).where(and(eq(projects.id,projectId),eq(projects.ownerEmail,ownerEmail))).limit(1); if(!project) return Response.json({error:"项目不存在"},{status:404});
    const images=await db.select().from(projectImages).where(eq(projectImages.projectId,projectId)); if(!images.length) return Response.json({error:"项目没有图片"},{status:400});
    const research=await db.select({title:researchReferences.title,copyAnalysis:researchReferences.copyAnalysis,coverAnalysis:researchReferences.coverAnalysis,audienceInsight:researchReferences.audienceInsight,reusablePattern:researchReferences.reusablePattern}).from(researchReferences).where(eq(researchReferences.ownerEmail,ownerEmail)).orderBy(desc(researchReferences.researchDate),desc(researchReferences.likes)).limit(3);
    const previousProjects=await db.select({id:projects.id,name:projects.name,draftJson:projects.draftJson}).from(projects).where(eq(projects.ownerEmail,ownerEmail)).orderBy(desc(projects.createdAt)).limit(30);
    const existing=previousProjects.filter((item)=>item.id!==projectId).map((item)=>({name:item.name,...draftCopy(item.draftJson)}));
    const content:Array<Record<string,unknown>>=[{type:"input_text",text:"你是个人室内设计工作室的高级内容秘书。必须先逐张识别上传的项目实景图，再结合已知设计信息生成完整且只属于当前项目的小红书创作成品，包括3个笔记标题、封面英文栏目、封面主标题、封面副标题、封面样式、正文、话题标签、图片分析重点和发布风险提示。先识别每张图真实可见的空间类型、材质、色彩、灯光、动线、功能、构图、人物使用场景和画面情绪，再选择最适合封面的图片序号；已知设计信息用于解释画面，但与照片冲突时必须标为待确认，不能猜测。必须针对当前空间类型改变叙事重点、标题角度、封面选图和视觉样式，不能把住宅客厅、卧室、办公、酒店、商业和展厅写成同一套模板。当前空间专属策略："+spaceDesignGuidance(project.projectType,project.category)+"必须使用最近3篇室内设计引流笔记库中提炼的标题结构、正文节奏、客户需求洞察和自然咨询引导方法进行升级，但不得复制参考原文。当前账号已有项目的标题、封面主副标题与正文也全部视为禁用语料：新结果不得复用任何完整标题、封面文字、段落、句式开头或连续14个以上相同汉字，必须改变主题切口、叙事顺序、动词和结尾。标题或正文可自然使用2至4个与空间气质匹配的小表情，标题最多1个，禁止连续堆叠，话题标签中不要放表情。只借鉴抽象规律，不虚构地点、面积、客户身份、材料品牌或完工事实。生成3个彼此不同且与历史项目不同的小红书笔记标题，分别侧重空间情绪、照片中的设计亮点、实际使用价值；每个标题不超过20个汉字。正文必须至少写出三项能从当前照片或项目资料验证的专属设计细节，并在结尾用与当前空间相关的自然问题邀请读者交流需求。coverEyebrow 必须是简洁的大写英文，格式为 ORIGINAL DESIGN · 加空间类别，最多44个字符。titleOptions 必须正好包含3个互不重复标题，title 必须等于 titleOptions 第一项。根据当前项目照片重新推荐 coverStyle：fontFamily 只能是 serif/sans/kai；titleColor、subtitleColor、overlayColor、patternColor 使用6位十六进制颜色；overlayOpacity 为0-90；pattern 只能是 none/frame/grid/dots/corners/polka/textile/gradient/blue-white-dots；titleSize 为52-120；align 只能是 left/center；position 只能是 top/middle/bottom。只返回 JSON，字段为 title, titleOptions, coverEyebrow, coverTitle, coverSubtitle, coverStyle, body, tags, highlights, riskNotes, coverIndex。当前项目事实："+JSON.stringify(project)+"。已有项目禁用文字："+JSON.stringify(existing).slice(0,14000)+"。近期室内设计引流笔记（只学习结构，不复制文字）："+JSON.stringify(research)}];
    for(const image of images.sort((a,b)=>a.sortOrder-b.sortOrder).slice(0,10)){ const object=await runtime.PROJECT_MEDIA.get(image.objectKey); if(!object) continue; const bytes=new Uint8Array(await object.arrayBuffer()); let binary=""; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000)); content.push({type:"input_image",image_url:`data:${image.contentType};base64,${btoa(binary)}`,detail:"high"}); }
    let generated=await requestDraft(runtime,content); let draft=generated.draft; let provider=generated.provider; let duplicates=duplicateFragments(draft,existing); if(duplicates.length){generated=await requestDraft(runtime,content,duplicates); draft=generated.draft; provider=generated.provider; duplicates=duplicateFragments(draft,existing);} if(duplicates.length) throw new Error("生成内容仍与已有项目重复，请补充更具体的设计信息后重试"); const options=(Array.isArray(draft.titleOptions)?draft.titleOptions:[]).map((item)=>String(item).trim()).filter(Boolean).slice(0,3); while(options.length<3) options.push(options.length===0?draft.title:`${draft.title}｜方案${options.length+1}`); if(new Set(options.map(normalizedCopy)).size!==3) throw new Error("三个标题方案重复，请重新生成"); draft.titleOptions=options; draft.title=options[0]; draft.coverEyebrow=String(draft.coverEyebrow||defaultCoverEyebrow(project.projectType,project.category)).toUpperCase().slice(0,44); draft.mode=`${provider} 多图识别 · 历史项目去重`; draft.coverIndex=Math.min(images.length-1,Math.max(0,Number(draft.coverIndex||0))); await db.update(projects).set({status:"drafted",draftJson:JSON.stringify(draft)}).where(and(eq(projects.id,projectId),eq(projects.ownerEmail,ownerEmail))); return Response.json({draft});
  } catch(error){return apiError(error,"生成失败");}
}
