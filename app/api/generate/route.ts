import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectImages, projects } from "../../../db/schema";
import { apiError, requireAccountEmail } from "../../../lib/account";

type Project = { id:number; name:string; location:string; area:string; projectType:string; category:string; audience:string; brief:string };
type Strategy = { name:string; hook:string; cover:string; subtitle:string; value:string; question:string; eyebrow:string; keywords:string[] };
type Draft = { projectName:string; detectedSpaceType:string; designSummary:string; title:string; titleOptions:string[]; coverEyebrow:string; coverTitle:string; coverSubtitle:string; coverStyle:Record<string,unknown>; body:string; tags:string[]; highlights:string[]; riskNotes:string[]; coverIndex:number; mode:string };

const strategyLibrary: Record<string, Strategy[]> = {
  "商业项目": [
    { name:"场景引力",hook:"商业空间真正的价值，是让人愿意走进来并停留下来",cover:"让顾客愿意停留",subtitle:"品牌记忆 × 顾客路径 × 到店体验",value:"从门头识别、顾客动线、核心消费场景与停留体验切入，说明设计如何帮助品牌被看见、被记住并产生转化。",question:"你的商业空间最想先提升进店率、停留时间还是品牌记忆？",eyebrow:"ORIGINAL DESIGN · RETAIL",keywords:["商业空间设计","店铺设计","品牌空间","门店设计","顾客动线"] },
    { name:"品牌发生地",hook:"好看的店很多，能被顾客记住的空间却很少",cover:"空间就是品牌记忆",subtitle:"第一眼吸引 × 场景体验 × 商业转化",value:"围绕第一眼吸引力、拍照传播点、陈列秩序与消费路径，提炼可收藏的商业设计判断方法。",question:"顾客离店之后，你希望他记住空间里的哪一幕？",eyebrow:"ORIGINAL DESIGN · COMMERCIAL",keywords:["商业设计","零售空间设计","品牌门店","空间体验","设计公司"] },
  ],
  "住宅项目": [
    { name:"日常栖居",hook:"住宅设计不是堆风格，而是让每天的生活更顺手",cover:"把生活放在设计之前",subtitle:"采光 × 动线 × 收纳 × 家庭互动",value:"从回家动线、家庭互动、采光、收纳与清洁维护切入，把设计语言转化为真实可感的居住价值。",question:"你最想通过设计解决家里的采光、收纳还是动线问题？",eyebrow:"ORIGINAL DESIGN · RESIDENCE",keywords:["住宅设计","全案设计","家装设计","改善型住宅","室内设计"] },
    { name:"光影之家",hook:"好的家不急着表达，它会慢慢回应生活",cover:"让家回到生活本身",subtitle:"松弛感 × 空间秩序 × 长久耐看",value:"围绕空间松弛感、家人关系、物品秩序与长期居住体验，提供比风格标签更有价值的内容。",question:"对于理想的家，你更看重松弛感、秩序感还是陪伴感？",eyebrow:"ORIGINAL DESIGN · HOME",keywords:["住宅空间设计","原木风住宅","收纳设计","家庭动线","全屋设计"] },
  ],
  "办公项目": [
    { name:"共序办公空间",hook:"办公室不只要好看，更要让协作自然发生",cover:"让协作自然发生",subtitle:"办公动线 × 品牌表达 × 使用效率",value:"从专注、协作、接待和休息四类真实工作场景出发，说明动线如何减少干扰、空间如何支持团队切换状态。",question:"你的团队更需要安静专注，还是高效协作？",eyebrow:"ORIGINAL DESIGN · WORKPLACE",keywords:["办公室设计","办公空间设计","办公空间改造","办公动线","设计公司"] },
    { name:"品牌会客厅",hook:"客户走进办公室的第一分钟，已经开始认识品牌",cover:"空间就是品牌名片",subtitle:"第一印象 × 接待体验 × 团队文化",value:"围绕客户第一印象、员工体验、会议效率与企业文化，讲清办公室设计如何同时服务内部团队与外部品牌。",question:"你的办公室现在能让客户记住什么？",eyebrow:"ORIGINAL DESIGN · OFFICE",keywords:["办公室装修设计","企业展厅","办公空间","品牌办公","会议室设计"] },
  ],
  "酒店项目": [
    { name:"抵达之后",hook:"酒店体验，从客人真正抵达之前就已经开始",cover:"设计一场值得记住的抵达",subtitle:"在地感 × 服务动线 × 停留体验",value:"从抵达、办理、停留、休息与服务动线展开，说明空间如何减少陌生感并形成可被记住的旅居体验。",question:"一家酒店最应该让客人记住的是抵达、客房还是公共空间？",eyebrow:"ORIGINAL DESIGN · HOSPITALITY",keywords:["酒店设计","酒店空间设计","精品酒店","民宿设计","旅居空间"] },
    { name:"旅居片段",hook:"真正打动人的酒店，不只是睡一晚的房间",cover:"把旅程留在空间里",subtitle:"客房舒适 × 公区社交 × 情绪记忆",value:"围绕客房舒适度、公区社交、灯光情绪与运营维护，提供兼顾体验和经营的设计价值。",question:"你选择酒店时，更容易被客房细节还是公共空间吸引？",eyebrow:"ORIGINAL DESIGN · HOTEL",keywords:["酒店客房设计","酒店大堂设计","度假酒店","民宿空间","酒店改造"] },
  ],
  "展厅陈列项目": [
    { name:"观看的路径",hook:"展厅不是把内容摆出来，而是设计观看发生的顺序",cover:"让观看有一条清晰路径",subtitle:"叙事顺序 × 视觉焦点 × 停留节奏",value:"从参观顺序、观看距离、信息层级、灯光焦点与停留节点展开，说明展陈如何帮助内容被理解和记住。",question:"你的展厅最需要解决的是信息太多、动线混乱还是缺少记忆点？",eyebrow:"ORIGINAL DESIGN · EXHIBITION",keywords:["展厅设计","展陈设计","企业展厅","陈列设计","展示空间"] },
    { name:"叙事展场",hook:"好的展陈，让复杂内容在行走中自然被理解",cover:"把内容变成空间叙事",subtitle:"信息层级 × 展陈节奏 × 品牌表达",value:"围绕内容组织、主次关系、展项互动与品牌识别，输出可收藏的展厅策划和空间判断。",question:"参观者离开展厅时，你希望他带走哪一个核心信息？",eyebrow:"ORIGINAL DESIGN · DISPLAY",keywords:["展览设计","品牌展厅","商业陈列","展馆设计","空间叙事"] },
  ],
  "其他项目": [
    { name:"空间新作",hook:"不先定义风格，先看空间真正要解决什么",cover:"让设计回应真实需求",subtitle:"使用场景 × 空间秩序 × 视觉记忆",value:"从使用者、行为路径、空间焦点和长期体验切入，避免空泛风格描述，建立专业且容易传播的设计表达。",question:"这个空间最需要被改善的使用体验是什么？",eyebrow:"ORIGINAL DESIGN · INTERIOR",keywords:["室内设计","空间设计","设计项目","空间改造","设计公司"] },
    { name:"界面之间",hook:"空间的差异，不在标签，而在每一次真实使用",cover:"从真实使用开始设计",subtitle:"功能关系 × 场景体验 × 设计表达",value:"围绕功能关系、行走路径、视觉层次与使用体验，提炼照片和资料能够支持的专业价值。",question:"你更关注这个空间的功能效率，还是它带来的情绪体验？",eyebrow:"ORIGINAL DESIGN · SPACE",keywords:["空间设计案例","室内空间","设计灵感","空间美学","项目实景"] },
  ],
};

function buildDraft(project: Project, imageCount: number): Draft {
  const category = strategyLibrary[project.category] ? project.category : "其他项目";
  const visualSeed = `${project.projectType}${project.brief}`.split("").reduce((sum, char) => sum + char.charCodeAt(0), project.id);
  const strategies = strategyLibrary[category];
  const strategy = strategies[Math.abs(visualSeed) % strategies.length];
  const projectName = project.name && !/实景图识别项目|未命名项目/.test(project.name) ? project.name : strategy.name;
  const spaceType = project.projectType || category.replace("项目", "空间");
  const designSummary = project.brief?.trim() || `${category}内容将围绕真实使用场景、空间秩序与视觉体验展开；具体材料、功能和面积以人工确认为准。`;
  const locationKeyword = project.location ? `${project.location}${strategy.keywords[0]}` : strategy.keywords[0];
  const areaKeyword = project.area ? `${project.area}${category.replace("项目", "空间")}` : strategy.keywords[1];
  const titles = [`${spaceType}，${strategy.cover}✨`, strategy.hook, `${category.replace("项目", "设计")}先看这3点`].map((item)=>item.slice(0,20));
  const tags = [...new Set([locationKeyword, areaKeyword, spaceType, ...strategy.keywords])].slice(0,9);
  return {
    projectName, detectedSpaceType:spaceType, designSummary, title:titles[0], titleOptions:titles,
    coverEyebrow:strategy.eyebrow, coverTitle:strategy.cover, coverSubtitle:strategy.subtitle,
    coverStyle:{fontFamily:"sans",titleColor:"#ffffff",subtitleColor:"#f1eee7",overlayColor:"#162019",overlayOpacity:52,pattern:"frame",patternColor:"#ffffff",titleSize:82,titleOffsetX:0,titleOffsetY:2,titleDirection:"horizontal",align:"left",position:"bottom",patternOffsetX:0,patternOffsetY:0,patternScale:100,eyebrowX:7.6,eyebrowY:5.8,eyebrowSize:24,eyebrowOpacity:92,showEyebrowLine:true,subtitleSize:26,subtitleOffsetX:0,subtitleOffsetY:0},
    body:`${strategy.hook}。\n\n这组实景最先留下的是空间的整体情绪：${designSummary}\n\n${strategy.value}\n\n比起只追求一眼惊艳，我们更在意空间进入真实使用之后，是否依然顺手、耐看，也能让身处其中的人感到舒服。设计不是把元素堆满，而是让每一个视觉重点和使用场景都有理由。\n\n如果你也在规划${category.replace("项目", "空间")}，可以先从“谁在使用、怎样行走、希望被记住什么”这三个问题开始。\n\n${strategy.question}`,
    tags, highlights:[`核心关键词：${tags.slice(0,5).join("、")}`,"封面用一个情绪利益点提高打开率","正文采用可直接发布的场景化叙事","长尾关键词自然进入标题正文和标签"],
    riskNotes:["具体材质、面积、功能与客户信息需人工确认后发布","本地视觉分析不推测照片无法确认的事实"], coverIndex:imageCount>0?0:0,
    mode:`${category} · 小红书流量爆款版 · 无 API`,
  };
}

export async function POST(request: Request) {
  try {
    const ownerEmail=await requireAccountEmail(); const {projectId}=await request.json() as {projectId?:number};
    if(!projectId) return Response.json({error:"缺少项目编号"},{status:400}); const db=getDb();
    const [project]=await db.select().from(projects).where(and(eq(projects.id,projectId),eq(projects.ownerEmail,ownerEmail))).limit(1);
    if(!project) return Response.json({error:"项目不存在"},{status:404});
    const images=await db.select().from(projectImages).where(eq(projectImages.projectId,projectId)); if(!images.length) return Response.json({error:"项目没有图片"},{status:400});
    const draft=buildDraft(project,images.length); const generatedMeta={name:draft.projectName,projectType:draft.detectedSpaceType,brief:draft.designSummary};
    await db.update(projects).set({...generatedMeta,status:"drafted",draftJson:JSON.stringify(draft)}).where(and(eq(projects.id,projectId),eq(projects.ownerEmail,ownerEmail)));
    return Response.json({draft,meta:generatedMeta});
  } catch(error) { return apiError(error,"生成失败"); }
}
