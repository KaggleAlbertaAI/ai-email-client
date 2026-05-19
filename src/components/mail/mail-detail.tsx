// 邮件详情组件

import type { UnifiedEmail } from "@/types";

interface MailDetailProps {
  email: UnifiedEmail;
}

export function MailDetail({ email }: MailDetailProps) {
  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg font-semibold md:text-xl">{email.subject}</h2>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
          {(email.sender.name || email.sender.email).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium">{email.sender.name || email.sender.email}</p>
          <p className="text-xs text-muted-foreground">{email.sender.email}</p>
        </div>
      </div>
      <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{email.body.plain}</div>
    </div>
  );
}
