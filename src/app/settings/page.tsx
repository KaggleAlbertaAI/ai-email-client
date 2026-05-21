// Settings page — server wrapper
// 强制动态渲染，因为需要使用 useSearchParams

import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsClient />;
}
