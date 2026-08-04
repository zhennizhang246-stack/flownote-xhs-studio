# MJ 小红书热门笔记采集助手

本机 Playwright 服务，为创作平台采集公开可见的室内设计图文笔记并提炼关键词、标签和标题结构。实现思路参考 [hl897tech/xhs_content_agent](https://github.com/hl897tech/xhs_content_agent)，代码为适配 MJ 平台的独立实现。

首次运行会打开独立 Chromium 窗口，请在窗口中自行登录小红书。登录状态只保存在本目录的 `.profile`，不会上传到网站或 GitHub。

```powershell
npm install
npm run install-browser
npm start
```

服务仅监听 `127.0.0.1:8766`，只允许 MJ 主站和本地开发站访问。遇到登录或安全验证时会停止采集并提示人工处理。
