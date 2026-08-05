type ProjectFacts = {
  name?: string;
  location?: string;
  projectType?: string;
  category?: string;
  brief?: string;
};

const sceneLines = {
  commercial: [
    "走进来的瞬间，拍照瘾直接犯了📸", "这颜值开一家火一家，氛围先赢麻了😭", "推门像进电影片场，随手拍都很出片🎬",
    "路过很难不回头，门头直接长在审美上", "建议列入打卡清单，不拍够 9 张别出来",
  ],
  residential: [
    "住进去能宅到天荒地老🤌", "一进门疲惫感直接清零，谁懂啊", "不是样板间，是理想中的家啊✨",
    "把日子过成慢镜头，温柔到骨子里", "越简单越高级，这份松弛感真的绝了",
  ],
  office: [
    "在这上班我自愿加班（不是）🙏", "上班像泡咖啡馆，摸鱼都变香了", "别人家的办公室从来不会让人失望",
    "打工人梦中情司，下班都不想走", "把松弛感焊死在办公室里",
  ],
  retreat: [
    "推门像误入江南，直接不想走了🍃", "城市避世天花板，待一天都不无聊", "老空间改完太绝了，东方美学拉满",
    "偷得浮生半日闲，治愈所有内耗", "一脚踏进水墨画里，步步是景",
  ],
} as const;

function hash(text: string) {
  let value = 2166136261;
  for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return value >>> 0;
}

function clean(value?: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function infer(facts: ProjectFacts) {
  const source = `${facts.category} ${facts.projectType} ${facts.brief}`;
  if (/办公|企业|工作室|联合办公/.test(source)) return { scene: "office" as const, space: clean(facts.projectType) || "办公空间", place: "城市办公场景" };
  if (/民宿|庭院|院落|老宅|度假|酒店/.test(source)) return { scene: "retreat" as const, space: clean(facts.projectType) || "度假空间", place: "城市里" };
  if (/商业|咖啡|烘焙|买手|餐饮|门店|展厅|零售/.test(source)) return { scene: "commercial" as const, space: clean(facts.projectType) || "商业空间", place: "街角" };
  return { scene: "residential" as const, space: clean(facts.projectType) || "住宅空间", place: "日常里" };
}

function inferStyle(facts: ProjectFacts) {
  const source = `${facts.name} ${facts.brief} ${facts.projectType}`;
  for (const style of ["中古风", "原木风", "侘寂风", "现代风", "复古风", "极简风", "东方风", "自然风"]) {
    if (source.includes(style.replace("风", ""))) return style;
  }
  return /木|暖|自然|植物/.test(source) ? "自然感" : /金属|玻璃|线条|简洁/.test(source) ? "现代感" : "高级感";
}

function tagsFor(scene: ReturnType<typeof infer>["scene"], style: string, location: string) {
  const vertical = scene === "commercial" ? ["商业空间设计", "门店设计"] : scene === "office" ? ["办公空间设计", "办公室装修"] : scene === "retreat" ? ["民宿设计", "庭院设计"] : ["住宅设计", "家装设计"];
  return ["室内设计", "装修灵感", style, `${style}设计`, "空间美学", ...vertical, ...(location ? [`${location}设计`] : [])].slice(0, 8);
}

export function createFallbackDraft(facts: ProjectFacts, imageCount: number, reason = "视觉服务额度暂不可用") {
  const profile = infer(facts);
  const style = inferStyle(facts);
  const seed = hash(`${facts.name}|${facts.brief}|${imageCount}`);
  const lines = sceneLines[profile.scene];
  const first = lines[seed % lines.length];
  const second = lines[(seed + 2) % lines.length];
  const memory = profile.scene === "office" ? "松弛感" : profile.scene === "commercial" ? "氛围感" : profile.scene === "retreat" ? "避世感" : "治愈感";
  const visual = clean(facts.brief).slice(0, 24) || "空间氛围与生活感";
  const titleOptions = [
    `谁懂啊！这${profile.space}一走进去就像开了滤镜`,
    `${style}${profile.space}直接封神！拍不完根本拍不完`,
    `救命！这${profile.space}颜值也太超标了吧😭`,
    `藏在${profile.place}的${style}${profile.space}，美到失语`,
    `建议收藏！${style}${profile.space}抄作业模板`,
  ];
  const body = `第一眼就被这组空间氛围拿捏了✨\n${visual}成为画面记忆点，整体克制却很有情绪。\n${first}\n${second}\n你最想把哪一处灵感搬进自己的项目？`;
  return {
    title: titleOptions[seed % titleOptions.length],
    titleOptions,
    coverEyebrow: "ORIGINAL DESIGN · INTERIOR",
    coverTitle: `${memory}才是顶级情绪价值`,
    coverSubtitle: `${style}・${visual}`,
    coverStyle: { fontFamily: "serif", titleColor: "#ffffff", subtitleColor: "#eee9df", overlayColor: "#121713", overlayOpacity: 58, pattern: "frame", patternColor: "#ffffff", titleSize: 88, align: "left", position: "bottom" },
    body: body.slice(0, 150),
    tags: tagsFor(profile.scene, style, clean(facts.location)),
    highlights: ["5 套点击标题公式", "150 字以内短正文", "按空间分类匹配网感梗句", "8 个搜索标签配比"],
    riskNotes: [`${reason}，已启用网站内置备用创作引擎`, "备用模式只使用项目分区与已知信息，不猜测未知材质"],
    coverIndex: Math.max(0, Math.min(imageCount - 1, seed % Math.max(imageCount, 1))),
    mode: "网站内置爆款文案引擎 · 免 API 额度",
    styleVariants: [],
  };
}
