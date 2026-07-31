const callStudio = async (action, payload = {}) => {
  const { result } = await wx.cloud.callFunction({ name: "studio", data: { action, ...payload } });
  if (!result || result.ok === false) throw new Error(result?.error || "服务暂不可用");
  return result;
};

const showError = (error, fallback = "操作失败") => {
  wx.showToast({ title: error?.message || fallback, icon: "none" });
};

module.exports = { callStudio, showError };
