// Compose page — server wrapper to opt out of static generation
// Next.js 14 requires a server component to export `dynamic` for route-level control

import ComposeClient from "./compose-client";

export const dynamic = "force-dynamic";

export default function ComposePage() {
  return <ComposeClient />;
}
