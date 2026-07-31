const { callStudio, showError } = require("../../utils/studio");

const categories = ["住宅项目", "商业项目", "办公项目", "酒店项目", "展厅陈列项目", "其他项目"];

Page({
  data: {
    categories,
    categoryIndex: 0,
    images: [],
    form: { name: "", location: "", area: "", brief: "" },
    draft: null,
    saving: false,
  },
  updateField(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },
  changeCategory(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
  },
  async chooseImages() {
    const remaining = 10 - this.data.images.length;
    if (remaining <= 0) return wx.showToast({ title: "最多上传10张", icon: "none" });
    const result = await wx.chooseMedia({ count: remaining, mediaType: ["image"], sourceType: ["album", "camera"], sizeType: ["compressed"] });
    this.setData({ images: [...this.data.images, ...result.tempFiles.map((item) => ({ tempFilePath: item.tempFilePath }))] });
  },
  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({ images: this.data.images.filter((_, itemIndex) => itemIndex !== index) });
  },
  async uploadImages() {
    const uploads = this.data.images.map(async (item, index) => {
      const suffix = item.tempFilePath.split(".").pop() || "jpg";
      const cloudPath = `projects/${Date.now()}-${index}.${suffix}`;
      const result = await wx.cloud.uploadFile({ cloudPath, filePath: item.tempFilePath });
      return { fileId: result.fileID, sortOrder: index };
    });
    return Promise.all(uploads);
  },
  async createProject() {
    if (!this.data.images.length) return wx.showToast({ title: "请先上传项目实景图", icon: "none" });
    if (!this.data.form.name.trim()) return wx.showToast({ title: "请填写项目名称", icon: "none" });
    this.setData({ saving: true });
    wx.showLoading({ title: "正在建立项目" });
    try {
      const images = await this.uploadImages();
      const result = await callStudio("createProject", {
        project: { ...this.data.form, category: categories[this.data.categoryIndex], images },
      });
      this.setData({ draft: result.project.draft });
      wx.showToast({ title: "封面与文案已生成", icon: "success" });
    } catch (error) {
      showError(error, "项目创建失败");
    } finally {
      wx.hideLoading();
      this.setData({ saving: false });
    }
  },
  copyDraft() {
    const draft = this.data.draft;
    if (!draft) return;
    wx.setClipboardData({ data: `${draft.title}\n\n${draft.body}\n\n${draft.tags.map((tag) => `#${tag}`).join(" ")}` });
  },
});
