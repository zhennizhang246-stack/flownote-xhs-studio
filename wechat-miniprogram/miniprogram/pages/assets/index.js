const { callStudio, showError } = require("../../utils/studio");
Page({
  data: { projects: [], loading: true },
  onShow() { this.loadProjects(); },
  onPullDownRefresh() { this.loadProjects().finally(() => wx.stopPullDownRefresh()); },
  async loadProjects() {
    try {
      const result = await callStudio("listProjects");
      this.setData({ projects: result.projects, loading: false });
    } catch (error) { this.setData({ loading: false }); showError(error); }
  },
  async approve(event) {
    try {
      await callStudio("approveProject", { projectId: event.currentTarget.dataset.id });
      wx.showToast({ title: "已人工确认", icon: "success" });
      await this.loadProjects();
    } catch (error) { showError(error); }
  },
  copy(event) {
    const project = this.data.projects.find((item) => item._id === event.currentTarget.dataset.id);
    if (!project?.draft) return;
    wx.setClipboardData({ data: `${project.draft.title}\n\n${project.draft.body}\n\n${project.draft.tags.map((tag) => `#${tag}`).join(" ")}` });
  },
});
