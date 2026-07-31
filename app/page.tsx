import { StudioSecretary } from "./studio-secretary";

import { requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "栖作 · 小红书创作服务平台",
  description: "从室内项目实景图出发，生成引流封面、原创文案与三天发布排期。",
};

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <StudioSecretary accountName={user.displayName} />;
}
