// 邮件 API 请求封装
// 所有邮件相关的 API 调用统一在此管理

import type { Mail, MailAccount, MailFolder } from "@/types";

/** 获取收件箱邮件列表 */
export async function fetchInboxMail(accountId: string, page: number = 1): Promise<Mail[]> {
  const response = await fetch(`/api/mail/inbox?accountId=${accountId}&page=${page}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch emails: ${response.statusText}`);
  }
  return response.json();
}

/** 获取邮件详情 */
export async function fetchMailDetail(mailId: string): Promise<Mail> {
  const response = await fetch(`/api/mail/${mailId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch email details: ${response.statusText}`);
  }
  return response.json();
}

/** 发送邮件 */
export async function sendMail(payload: {
  to: string[];
  subject: string;
  body: string;
  accountId: string;
}): Promise<void> {
  const response = await fetch("/api/mail/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.statusText}`);
  }
}

/** 标记邮件为已读 */
export async function markMailAsRead(mailId: string): Promise<void> {
  const response = await fetch(`/api/mail/${mailId}/read`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error(`Failed to mark as read: ${response.statusText}`);
  }
}

/** 删除邮件 */
export async function deleteMail(mailId: string): Promise<void> {
  const response = await fetch(`/api/mail/${mailId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete email: ${response.statusText}`);
  }
}

/** 获取邮件账户列表 */
export async function fetchAccounts(): Promise<MailAccount[]> {
  const response = await fetch("/api/accounts");
  if (!response.ok) {
    throw new Error(`Failed to fetch account list: ${response.statusText}`);
  }
  return response.json();
}

/** 获取邮件文件夹列表 */
export async function fetchFolders(accountId: string): Promise<MailFolder[]> {
  const response = await fetch(`/api/folders?accountId=${accountId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch folder list: ${response.statusText}`);
  }
  return response.json();
}

/** 归档邮件 — Gmail 移除 INBOX 标签，Outlook 移动到归档文件夹 */
export async function archiveEmail(emailId: string): Promise<void> {
  const response = await fetch(`/api/emails/${emailId}/archive`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to archive email: ${response.statusText}`);
  }
}

/** 管理邮件标签 */
export async function updateEmailLabels(
  emailId: string,
  options: { add?: string[]; remove?: string[] }
): Promise<void> {
  const response = await fetch(`/api/emails/${emailId}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    throw new Error(`Failed to update labels: ${response.statusText}`);
  }
}
