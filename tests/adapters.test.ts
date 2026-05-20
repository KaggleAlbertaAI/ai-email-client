// Adapter unit tests — verify Gmail/Outlook/IMAP data conversion

import { describe, it, expect } from "vitest";
import { convertGmailToUnified } from "@/lib/api/gmail";
import { convertOutlookToUnified } from "@/lib/api/outlook";
import { convertImapToUnified } from "@/lib/api/imap";

describe("Gmail Adapter", () => {
  const mockGmailMessage = {
    id: "test-123",
    threadId: "thread-456",
    labelIds: ["INBOX", "UNREAD"],
    internalDate: "1700000000000",
    historyId: "1",
    sizeEstimate: 1024,
    payload: {
      partId: "",
      mimeType: "text/plain",
      filename: "",
      headers: [
        { name: "From", value: "张三 <zhangsan@example.com>" },
        { name: "To", value: "user@gmail.com" },
        { name: "Subject", value: "测试邮件" },
      ],
      body: { size: 10, data: Buffer.from("这是一封测试邮件").toString("base64") },
      parts: [],
    },
  };

  it("converts Gmail message to UnifiedEmail format", () => {
    const result = convertGmailToUnified(mockGmailMessage, "acc-gmail-1");

    expect(result.id).toBe("test-123");
    expect(result.subject).toBe("测试邮件");
    expect(result.sender.email).toBe("zhangsan@example.com");
    expect(result.sender.name).toBe("张三");
    expect(result.threadId).toBe("thread-456");
    expect(result.source.protocol).toBe("gmail");
    expect(result.source.accountId).toBe("acc-gmail-1");
  });

  it("marks unread messages correctly", () => {
    const result = convertGmailToUnified(mockGmailMessage, "acc-gmail-1");
    expect(result.flags.isRead).toBe(false);
  });

  it("marks read messages correctly", () => {
    const readMessage = {
      ...mockGmailMessage,
      labelIds: ["INBOX"],
    };
    const result = convertGmailToUnified(readMessage, "acc-gmail-1");
    expect(result.flags.isRead).toBe(true);
  });
});

describe("Outlook Adapter", () => {
  const mockOutlookMessage = {
    id: "outlook-789",
    conversationId: "conv-123",
    subject: "Outlook Test",
    body: { contentType: "text" as const, content: "Hello from Outlook" },
    bodyPreview: "Hello from Outlook",
    sender: { emailAddress: { name: "李四", address: "lisi@company.com" } },
    toRecipients: [{ emailAddress: { name: "我", address: "user@company.com" } }],
    ccRecipients: [],
    bccRecipients: [],
    sentDateTime: "2024-01-15T10:00:00Z",
    receivedDateTime: "2024-01-15T10:00:00Z",
    isRead: true,
    isDraft: false,
    hasAttachments: false,
    flag: { flagStatus: "notFlagged" as const },
    importance: "normal" as const,
    internetMessageId: "<test@company.com>",
    attachments: [],
    parentFolderId: "inbox",
    changeKey: "change-1",
    createdDateTime: "2024-01-15T10:00:00Z",
    lastModifiedDateTime: "2024-01-15T10:00:00Z",
  };

  it("converts Outlook message to UnifiedEmail format", () => {
    const result = convertOutlookToUnified(mockOutlookMessage, "acc-outlook-1");

    expect(result.id).toBe("outlook-789");
    expect(result.subject).toBe("Outlook Test");
    expect(result.sender.email).toBe("lisi@company.com");
    expect(result.sender.name).toBe("李四");
    expect(result.threadId).toBe("conv-123");
    expect(result.source.protocol).toBe("graph");
  });

  it("maps recipients correctly", () => {
    const result = convertOutlookToUnified(mockOutlookMessage, "acc-outlook-1");
    expect(result.recipients.length).toBe(1);
    expect(result.recipients[0].email).toBe("user@company.com");
    expect(result.recipients[0].type).toBe("to");
  });

  it("handles null sender", () => {
    const noSenderMsg = { ...mockOutlookMessage, sender: null };
    const result = convertOutlookToUnified(noSenderMsg, "acc-outlook-1");
    expect(result.sender.email).toBe("");
  });
});

describe("IMAP Adapter", () => {
  const mockImapMessage = {
    uid: "imap-001",
    seq: "1",
    envelope: {
      date: "2024-01-15T10:00:00Z",
      subject: "IMAP Test",
      from: [{ name: "王五", route: null, mailbox: "wangwu", host: "example.com" }],
      sender: null,
      replyTo: null,
      to: [{ name: "我", route: null, mailbox: "user", host: "example.com" }],
      cc: null,
      bcc: null,
      messageId: "<imap-001@example.com>",
    },
    bodyStructure: {
      type: "text",
      subtype: "plain",
      encoding: "quoted-printable",
      size: 50,
    },
    flags: ["\\Seen"],
    internalDate: "2024-01-15T10:00:00Z",
    size: 50,
    bodyPlain: "Hello from IMAP",
    attachments: [],
  };

  it("converts IMAP message to UnifiedEmail format", () => {
    const result = convertImapToUnified(mockImapMessage, "acc-imap-1");

    expect(result.id).toBe("imap-001");
    expect(result.subject).toBe("IMAP Test");
    expect(result.sender.email).toBe("wangwu@example.com");
    expect(result.source.protocol).toBe("imap");
  });

  it("parses IMAP flags correctly", () => {
    const result = convertImapToUnified(mockImapMessage, "acc-imap-1");
    expect(result.flags.isRead).toBe(true);
    expect(result.flags.isStarred).toBe(false);
  });

  it("handles empty sender list", () => {
    const noSender = {
      ...mockImapMessage,
      envelope: { ...mockImapMessage.envelope, from: null },
    };
    const result = convertImapToUnified(noSender, "acc-imap-1");
    expect(result.sender.email).toBe("");
  });
});
