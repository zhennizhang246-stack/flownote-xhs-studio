import "./ui-preview.css";

const nav = ["创作工作台", "项目资产库", "发布日历", "引流笔记库"];
const titleIdeas = ["谁懂啊！住进会呼吸的木色里", "原木住宅直接封神，越住越松弛", "建议收藏！自然系住宅抄作业模板"];

export const metadata = { title: "栖作 UI 视觉预览" };

export default function UiPreviewPage() {
  return <main className="ui-demo">
    <aside className="demo-side">
      <div className="iris-mark" aria-hidden="true"><i/><i/><i/><i/><i/><span/></div>
      <div className="demo-brand"><b>栖</b><span>IRIS<br/>CREATIVE STUDIO</span></div>
      <nav>{nav.map((item, index) => <button className={index === 0 ? "active" : ""} key={item}><i>{String(index + 1).padStart(2, "0")}</i>{item}</button>)}</nav>
      <div className="side-status"><span>● 发布桥已连接</span><strong>12:00</strong><small>下一篇 · 三天后发布</small></div>
    </aside>

    <section className="demo-workspace">
      <div className="iris-ambient iris-ambient-one" aria-hidden="true"/><div className="iris-ambient iris-ambient-two" aria-hidden="true"/>
      <header className="demo-top"><div><small>XIAOHONGSHU CREATIVE SERVICE</small><h1>让每个空间，都有值得被看见的表达。</h1><p>上传项目实景图，完成识别、文案、封面与发布排期。</p></div><div className="demo-user"><span>新账户 · 功能已同步</span><b>MJ</b></div></header>

      <div className="demo-grid">
        <section className="demo-card creator-zone">
          <div className="card-head"><div><small>01 · PROJECT INPUT</small><h2>新建室内设计项目</h2></div><span>最多 10 张</span></div>
          <div className="upload-zone"><div className="upload-plus">＋</div><strong>拖入项目实景图</strong><p>秘书将识别空间、材质、色彩、采光与动线</p><button>选择项目图片</button></div>
          <div className="input-row"><label>项目类型<select defaultValue="住宅项目"><option>住宅项目</option></select></label><label>空间类型<input defaultValue="自然系原木住宅"/></label></div>
          <button className="generate-button"><span>生成封面＋正文与标题</span><b>→</b></button>
        </section>

        <aside className="demo-card cover-zone">
          <div className="card-head"><div><small>LIVE COVER</small><h2>发布封面预览</h2></div><span>1080 × 1440</span></div>
          <div className="cover-art"><img src="/ui-preview/project-living.jpg" alt="温润木色住宅项目"/><div className="cover-mask"/><span className="cover-en">ORIGINAL DESIGN · INTERIOR</span><div className="cover-title"><h3>松弛感<br/>才是家的顶级配置</h3><p>原木质感 · 自然光影</p></div><em>01 / 07</em></div>
          <div className="cover-actions"><button>编辑封面样式</button><button className="dark">确认封面</button></div>
        </aside>
      </div>

      <section className="demo-card copy-zone">
        <div className="card-head"><div><small>02 · EDITABLE COPY</small><h2>标题与正文创作</h2></div><span className="ready">AI 初稿已完成</span></div>
        <div className="copy-layout">
          <div className="title-list"><small>5 个标题方案 · 点击选择</small>{titleIdeas.map((title, index) => <button className={index === 0 ? "selected" : ""} key={title}><i>0{index + 1}</i><span>{title}</span><b>{index === 0 ? "已选择" : "选择"}</b></button>)}</div>
          <div className="body-copy"><label>正文<textarea defaultValue={'一推门，疲惫感就被木色和阳光接住了🍃\n\n温润木饰面一路延伸，留白让客餐厅更轻盈；自然光穿过绿植，把日常变成慢镜头✨\n\n不是样板间，是会让人想早点回家的生活。你更喜欢这种松弛感，还是利落现代感？'}/></label><div className="tag-row"><span>#室内设计</span><span>#原木风</span><span>#住宅设计</span><span>#装修灵感</span></div></div>
        </div>
      </section>

      <section className="bottom-row">
        <div className="demo-card mini-card"><small>PROJECT LIBRARY</small><h2>项目资产库</h2><div className="project-item"><img src="/ui-preview/project-entry.jpg" alt="项目缩略图"/><div><strong>温润木境</strong><span>住宅项目 · 文案已确认</span></div><b>→</b></div></div>
        <div className="demo-card mini-card schedule"><small>PUBLISH QUEUE</small><h2>发布日历</h2><div className="schedule-line"><time>08<br/><b>月</b></time><div><strong>12:00 · 温润木境</strong><span>发布桥定时任务已同步</span></div><button>编辑</button></div></div>
        <div className="demo-card mini-card"><small>VIRAL NOTE LIBRARY</small><h2>引流笔记库</h2><div className="metrics"><b>12</b><span>真实笔记样本</span><b>8.6w</b><span>最高可见点赞</span></div></div>
      </section>
    </section>
  </main>;
}
