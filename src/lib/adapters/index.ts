// 协议适配器统一分发器
// 根据协议类型路由到对应的转换函数

export { convertGmailToUnified } from "@/lib/api/gmail";
export { convertOutlookToUnified } from "@/lib/api/outlook";
export { convertImapToUnified } from "@/lib/api/imap";
