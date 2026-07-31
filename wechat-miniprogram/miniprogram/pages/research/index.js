const { callStudio, showError } = require("../../utils/studio");
Page({
  data: { references: [], form: { title: "", sourceUrl: "", note: "" }, saving: false },
  onShow() { this.load(); },
  async load() { try { const result = await callStudio("listResearch"); this.setData({ references: result.references }); } catch (error) { showError(error); } },
  update(event) { this.setData({ [`form.${event.currentTarget.dataset.key}`]: event.detail.value }); },
  async add() {
    this.setData({ saving: true });
    try { await callStudio("addResearch", { reference: this.data.form }); this.setData({ form: { title: "", sourceUrl: "", note: "" } }); await this.load(); wx.showToast({ title: "参考已保存" }); }
    catch (error) { showError(error); } finally { this.setData({ saving: false }); }
  },
  copyUrl(event) { wx.setClipboardData({ data: event.currentTarget.dataset.url }); },
});
