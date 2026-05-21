"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ComposeForm, ComposeMode } from "@/components/mail/compose-form";

export default function ComposeClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">Loading...</div>;
  }

  const mode = (params?.get("mode") as ComposeMode) ?? "new";
  const to = params?.get("to") ?? "";
  const subject = params?.get("subject") ?? "";
  const body = params?.get("body") ?? "";

  const handleSent = () => {
    router.push("/");
  };

  const handleClose = () => {
    router.push("/");
  };

  const originalEmail =
    mode !== "new"
      ? {
          sender: { name: to, email: to },
          recipients: [{ name: "Me", email: "user@gmail.com", type: "to" as const }],
          subject,
          body: { plain: body },
        }
      : undefined;

  return (
    <ComposeForm mode={mode} originalEmail={originalEmail} onSent={handleSent} onClose={handleClose} />
  );
}
