"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ComposeForm, ComposeMode } from "@/components/mail/compose-form";

/**
 * GET /compose
 * 查询参数:
 *   - mode: new | reply | replyAll | forward (默认 new)
 *   - to: 收件人邮箱
 *   - subject: 邮件主题
 *   - body: 邮件正文
 *
 * 示例:
 *   /compose?mode=reply&to=user@gmail.com&subject=Re:%20Hello&body=Hi%20there
 */
export default function ComposePage() {
  const router = useRouter();
  const params = useSearchParams();

  const mode = (params.get("mode") as ComposeMode) ?? "new";
  const to = params.get("to") ?? "";
  const subject = params.get("subject") ?? "";
  const body = params.get("body") ?? "";

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
          recipients: [{ name: "我", email: "user@gmail.com", type: "to" as const }],
          subject,
          body: { plain: body },
        }
      : undefined;

  return (
    <ComposeForm mode={mode} originalEmail={originalEmail} onSent={handleSent} onClose={handleClose} />
  );
}
