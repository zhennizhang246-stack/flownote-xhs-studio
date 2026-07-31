const { callStudio, showError } = require("../../utils/studio");
Page({
  data: { settings: { publishTime: "12:00", publishCadenceDays: 3, researchTime: "09:00", requireApproval: true }, projects: [], saving: false },
  onShow() { this.load(); },
  async load() {
    try {
      const [settings, projects] = await Promise.all([callStudio("getSettings"), callStudio("listProjects")]);
      this.setData({ settings: settings.settings, projects: projects.projects.filter((item) => ["approved", "scheduled"].includes(item.status)) });
    } catch (error) { showError(error); }
  },
  changeTime(event) { this.setData({ "settings.publishTime": event.detail.value }); },
  changeResearchTime(event) { this.setData({ "settings.researchTime": event.detail.value }); },
  changeCadence(event) { this.setData({ "settings.publishCadenceDays": Number(event.detail.value) || 3 }); },
  async save() {
    this.setData({ saving: true });
    try { await callStudio("saveSettings", { settings: this.data.settings }); wx.showToast({ title: "排期已保存" }); }
    catch (error) { showError(error); } finally { this.setData({ saving: false }); }
  },
});
