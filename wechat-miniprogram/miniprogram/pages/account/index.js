const { callStudio, showError } = require("../../utils/studio");
Page({
  data: { account: null, profileUrl: "", phoneAuthorized: false },
  async onShow() {
    this.setData({ profileUrl: wx.getStorageSync("xhsProfileUrl") || "" });
    try { const result = await callStudio("bootstrap"); this.setData({ account: result.account }); } catch (error) { showError(error); }
  },
  saveProfile(event) { const value = event.detail.value.trim(); wx.setStorageSync("xhsProfileUrl", value); this.setData({ profileUrl: value }); },
  getPhoneNumber(event) {
    if (!event.detail.code) return wx.showToast({ title: "未授权手机号", icon: "none" });
    this.setData({ phoneAuthorized: true });
    wx.showToast({ title: "手机号授权码已取得" });
  },
  copyProfile() { if (this.data.profileUrl) wx.setClipboardData({ data: this.data.profileUrl }); },
});
