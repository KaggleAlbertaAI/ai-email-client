// 邮件 API 请求封装
// 所有邮件相关的 API 调用统一在此管理

import type { Mail, MailAccount, MailFolder } from "@/types";

/** 获取收件箱邮件列表 */
export async function fetchInboxMail(accountId: string, page: number = 1): Promise<Mail[]> {
  const response = await fetch(`/api/mail/inbox?accountId=${accountId}&page=${page}`);
  if (!response.ok) {
    throw new Error(`获取邮件失败: ${response.statusText}`);
  }
  return response.json();
}

/** 获取邮件详情 */
export async function fetchMailDetail(mailId: string): Promise<Mail> {
  const response = await fetch(`/api/mail/${mailId}`);
  if (!response.ok) {
    throw new Error(`获取邮件详情失败: ${response.statusText}`);
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
    throw new Error(`发送邮件失败: ${response.statusText}`);
  }
}

/** 标记邮件为已读 */
export async function markMailAsRead(mailId: string): Promise<void> {
  const response = await fetch(`/api/mail/${mailId}/read`, {
    method: "PATCH",
  });
  if (!response.ok) {
    throw new Error(`标记已读失败: ${response.statusText}`);
  }
}

/** 删除邮件 */
export async function deleteMail(mailId: string): Promise<void> {
  const response = await fetch(`/api/mail/${mailId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`删除邮件失败: ${response.statusText}`);
  }
}

/** 获取邮件账户列表 */
export async function fetchAccounts(): Promise<MailAccount[]> {
  const response = await fetch("/api/accounts");
  if (!response.ok) {
    throw new Error(`获取账户列表失败: ${response.statusText}`);
  }
  return response.json();
}

/** 获取邮件文件夹列表 */
export async function fetchFolders(accountId: string): Promise<MailFolder[]> {
  const response = await fetch(`/api/folders?accountId=${accountId}`);
  if (!response.ok) {
    throw new Error(`获取文件夹列表失败: ${response.statusText}`);
  }
  return response.json();
}
