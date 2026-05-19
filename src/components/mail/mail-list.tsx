// 邮件列表组件

import type { UnifiedEmail } from "@/types";
import { formatDate } from "@/lib/utils";

interface MailListProps {
  emails: UnifiedEmail[];
  selectedId?: string;
  onSelect: (email: UnifiedEmail) => void;
}

export function MailList({ emails, selectedId, onSelect }: MailListProps) {
  return (
    <div className="divide-y">
      {emails.map((email) => (
        <button
          key={email.id}
          onClick={() => onSelect(email)}
          className={`w-full p-4 text-left transition-colors hover:bg-muted ${
            selectedId === email.id ? "bg-muted" : ""
          } ${!email.flags.isRead ? "font-semibold" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className="truncate">{email.sender.name || email.sender.email}</span>
            <span className="text-xs text-muted-foreground">
              {formatDate(new Date(email.timestamps.received))}
            </span>
          </div>
          <p className="mt-1 truncate text-sm">{email.subject}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{email.body.plain}</p>
        </button>
      ))}
    </div>
  );
}
