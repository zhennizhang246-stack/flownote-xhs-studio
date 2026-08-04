import { StudioSecretary } from "./studio-secretary";

import { requireChatGPTUser } from "./chatgpt-auth";
import { siteContent } from "../lib/site-content";
import { canClaimLegacyData } from "../lib/account";

export const dynamic = "force-dynamic";

export const metadata = {
  title: siteContent.title,
  description: siteContent.description,
};

export default async function Home() {
  const user = await requireChatGPTUser("/");
  const accountEmail = user.email.trim().toLowerCase().slice(0, 320);
  return <StudioSecretary accountKey={user.id} accountName={user.displayName} isSiteOwner={canClaimLegacyData(accountEmail)} />;
}
