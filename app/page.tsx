import { StudioSecretary } from "./studio-secretary";

import { requireChatGPTUser } from "./chatgpt-auth";
import { siteContent } from "../lib/site-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: siteContent.title,
  description: siteContent.description,
};

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <StudioSecretary accountName={user.displayName} />;
}
