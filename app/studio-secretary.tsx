"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type Draft = {
  title: string; coverTitle: string; coverSubtitle: string; body: string;
  tags: string[]; highlights: string[]; riskNotes: string[];
  coverIndex?: number; mode?: string;
};
type ProjectMeta = {
  name: string; location: string; area: string; projectType: string; audience: string; brief: string;
};

const seededImages = Array.from({ length: 7 }, (_, i) => `/projects/warm-wood-home/0${i + 1}.jpg`);
const seededDraft: Draft = {
  title: "温州150㎡，把自然搬进日常的家",
  coverTitle: "住进自然里",
  coverSubtitle: "浙江温州 · 150m² 木质住宅",
  body: "比起堆叠风格，我们更想让这个家拥有接近自然的呼吸感。\n\n从玄关开始，温润木色一路延伸到客餐厅、厨房与卧室。克制的材质关系让光影成为空间里真正的主角；绿植、框景与大面积留白，则把四季变化悄悄带进日常。\n\n开放的客餐厅让家人自然聚拢，厨房岛台承接备餐与交流，洗衣房和衣帽间把功能收进秩序里。设计没有刻意制造视觉喧哗，而是在每一次行走、停留与收纳中，留下松弛。\n\n好的住宅不急着表达，它会在住进去之后，慢慢回应生活。",
  tags: ["温州室内设计", "原木风", "自然系住宅", "住宅设计", "全案设计", "实景案例"],
  highlights: ["木质天花延续空间秩序", "客餐厅一体化社交动线", "自然框景与柔和照明", "完整家政与收纳系统"],
  riskNotes: ["项目名称、客户需求和具体材料品牌待确认"],
  coverIndex: 1,
  mode: "案例预览",
};
const initialMeta: ProjectMeta = {
  name: "栖光木境", location: "浙江 · 温州", area: "150m²", projectType: "住宅空间",
  audience: "重视自然、松弛感与收纳秩序的改善型家庭",
  brief: "温润木质、自然光与绿意贯穿全屋；客餐厅一体，包含厨房、家政、卧室、衣帽间与卫浴。",
};
const navItems = [["01", "创作工作台"], ["02", "项目资产库"], ["03", "发布日历"], ["04", "流量参考"]];
const toDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
});
function localFallback(meta: ProjectMeta): Draft {
  const location = meta.location || "项目所在地待确认"; const area = meta.area || "面积待确认";
  return {
    title: `${location}${area}，让自然成为家的底色`, coverTitle: "让家自然生长",
    coverSubtitle: `${location} · ${area} ${meta.projectType || "空间设计"}`,
    body: `这个项目从真实的居住感受出发，而不是先定义一种风格。\n\n${meta.brief || "我们从光线、材质、动线与收纳重新梳理空间。"}\n\n画面里的材质、自然光和克制留白共同构成温和的空间秩序。功能被收进日常动线里，人在其中可以更松弛地停留、交流和生活。\n\n如果你也在寻找适合自己的居住方式，欢迎带着户型与需求来聊聊。`,
    tags: ["室内设计", "住宅设计", "实景案例", "全案设计", "自然系住宅", "设计工作室"],
    highlights: ["从上传图片提取视觉基调", "依据画面选择竖版封面", "正文避免虚构未知项目事实"],
    riskNotes: ["当前为本地视觉预览；连接 AI 后可完成多图语义分析"], coverIndex: 0, mode: "本地视觉预览",
  };
}

export function StudioSecretary() {
  const [meta, setMeta] = useState(initialMeta); const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState(seededImages); const [draft, setDraft] = useState<Draft>(seededDraft);
  const [phase, setPhase] = useState<"ready" | "uploading" | "analyzing" | "done">("ready");
  const [notice, setNotice] = useState("案例已就绪，可替换图片重新生成"); const [scheduled, setScheduled] = useState(false);
  const coverImage = previews[draft.coverIndex ?? 0] || seededImages[0];
  const phaseLabel = { ready: "等待项目", uploading: "整理项目资产", analyzing: "分析空间与生成内容", done: "封面与文案已完成" }[phase];
  const facts = useMemo(() => [meta.location || "地点待确认", meta.area || "面积待确认", meta.projectType || "空间类型待确认"], [meta]);
  const updateMeta = (key: keyof ProjectMeta, value: string) => setMeta((current) => ({ ...current, [key]: value }));
  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Array.from(event.target.files || []); if (!next.length) return;
    setFiles(next); setPreviews(next.map((file) => URL.createObjectURL(file))); setNotice(`已接收 ${next.length} 张项目实景图`); setPhase("ready");
  };
  async function handleGenerate(event: FormEvent) {
    event.preventDefault(); setPhase(files.length ? "uploading" : "analyzing"); setNotice(files.length ? "正在上传并建立项目资产…" : "正在重新分析示例项目…");
    if (!files.length) { await new Promise((r) => setTimeout(r, 550)); setDraft(seededDraft); setPhase("done"); setNotice("已依据 7 张实景图生成封面与原创文案"); return; }
    try {
      const images = await Promise.all(files.map(async (file) => ({ name: file.name, type: file.type || "image/jpeg", data: await toDataUrl(file) })));
      const saved = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...meta, images }) });
      if (!saved.ok) throw new Error("项目资产暂时无法保存"); const project = await saved.json() as { id: number };
      setPhase("analyzing"); setNotice("秘书正在识别空间、材质、灯光与画面重点…");
      const generated = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projectId: project.id }) });
      if (!generated.ok) { const error = await generated.json() as { error?: string }; throw new Error(error.error || "AI 生成暂不可用"); }
      const result = await generated.json() as { draft: Draft }; setDraft(result.draft); setPhase("done"); setNotice("已从实景图完成封面与原创文案");
    } catch (error) { setDraft(localFallback(meta)); setPhase("done"); setNotice(`${error instanceof Error ? error.message : "AI 暂不可用"}，已生成本地预览`); }
  }
  function handleSchedule() { setScheduled(true); setNotice("已加入三天发布节奏：下次中午 12:00"); }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">栖</span><div><strong>栖作</strong><small>STUDIO SECRETARY</small></div></div>
      <nav>{navItems.map(([n, label], i) => <button className={i === 0 ? "nav-item active" : "nav-item"} key={n}><span>{n}</span>{label}</button>)}</nav>
      <div className="cadence-card"><span className="live-dot"/><small>自动工作节奏</small><strong>每 3 天</strong><p>中午 12:00 准备发布</p></div>
      <p className="sidebar-note">图片、项目事实与草稿均按项目归档。发布前保留人工确认。</p>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="kicker">XIAOHONGSHU CREATIVE SERVICE</p><h1>小红书创作服务平台</h1></div><div className="topbar-actions"><span className={`status-chip ${phase}`}>{phaseLabel}</span><a className="avatar" href="https://www.xiaohongshu.com/user/profile/60f6318b0000000001015907" target="_blank" rel="noreferrer" aria-label="打开小红书账号 zhennizhang05">ZS</a></div></header>
      <div className="content-grid">
        <section className="creator-card">
          <div className="section-heading"><div><span>PROJECT INTAKE</span><h2>交给秘书一个新项目</h2></div><span className="counter">{files.length || 7} 张实景图</span></div>
          <form onSubmit={handleGenerate}>
            <label className="upload-zone"><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={handleFiles}/><div className="upload-icon">＋</div><strong>上传项目实景图</strong><span>支持 JPG / PNG / WEBP，建议 6–12 张</span></label>
            <div className="thumb-strip">{previews.slice(0, 7).map((image, i) => <button type="button" className={i === (draft.coverIndex ?? 0) ? "thumb selected" : "thumb"} key={`${image}-${i}`} onClick={() => setDraft((d) => ({ ...d, coverIndex: i }))} aria-label={`选择第 ${i + 1} 张作为封面`}><img src={image} alt=""/></button>)}</div>
            <div className="form-grid">
              <label className="wide"><span>项目名称</span><input value={meta.name} onChange={(e) => updateMeta("name", e.target.value)}/></label>
              <label><span>所在地</span><input value={meta.location} onChange={(e) => updateMeta("location", e.target.value)}/></label>
              <label><span>项目面积</span><input value={meta.area} onChange={(e) => updateMeta("area", e.target.value)}/></label>
              <label><span>空间类型</span><input value={meta.projectType} onChange={(e) => updateMeta("projectType", e.target.value)}/></label>
              <label><span>目标客户</span><input value={meta.audience} onChange={(e) => updateMeta("audience", e.target.value)}/></label>
              <label className="wide"><span>已知设计信息</span><textarea value={meta.brief} onChange={(e) => updateMeta("brief", e.target.value)}/></label>
            </div>
            <button className="primary-action" disabled={phase === "uploading" || phase === "analyzing"}><span>{phase === "analyzing" ? "正在分析…" : "分析图片并生成封面与文案"}</span><span>↗</span></button><p className="notice">{notice}</p>
          </form>
        </section>
        <section className="preview-panel">
          <div className="section-heading compact"><div><span>LIVE PREVIEW</span><h2>发布预览</h2></div><span className="mode-label">{draft.mode || "AI 分析"}</span></div>
          <div className="phone-frame"><div className="cover-preview"><img src={coverImage} alt="项目封面预览"/><div className="cover-shade"/><span className="cover-eyebrow">ORIGINAL DESIGN · RESIDENCE</span><div className="cover-copy"><h3>{draft.coverTitle}</h3><p>{draft.coverSubtitle}</p></div><span className="page-count">01 / {previews.length}</span></div></div>
          <div className="publish-actions"><button className="secondary-action" onClick={handleSchedule}>{scheduled ? "已加入发布队列" : "批准并加入三天排期"}</button><button className="icon-action" aria-label="导出发布包">↓</button></div>
        </section>
      </div>
      <section className="editorial-card">
        <div className="editorial-title"><span>GENERATED COPY</span><h2>{draft.title}</h2><div className="fact-row">{facts.map((fact) => <span key={fact}>{fact}</span>)}</div></div>
        <div className="copy-column">{draft.body.split("\n").map((line, i) => line ? <p key={`${line}-${i}`}>{line}</p> : <br key={`b-${i}`}/>)}<div className="tags">{draft.tags.map((tag) => <span key={tag}>#{tag.replace(/^#/, "")}</span>)}</div></div>
        <div className="analysis-column"><div><span className="mini-heading">图片分析要点</span><ul>{draft.highlights.map((item) => <li key={item}>{item}</li>)}</ul></div><div className="risk-box"><span>发布前确认</span>{draft.riskNotes.map((note) => <p key={note}>{note}</p>)}</div></div>
      </section>
    </section>
  </main>;
}
