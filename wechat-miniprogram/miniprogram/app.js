App({
  globalData: {
    account: null,
    cloudReady: false,
  },
  async onLaunch() {
    if (!wx.cloud) {
      wx.showModal({ title: "版本提示", content: "请升级微信后使用本小程序", showCancel: false });
      return;
    }
    wx.cloud.init({ traceUser: true });
    try {
      const { result } = await wx.cloud.callFunction({ name: "studio", data: { action: "bootstrap" } });
      this.globalData.account = result.account;
      this.globalData.cloudReady = true;
    } catch (error) {
      console.error("CloudBase bootstrap failed", error);
    }
  },
});
