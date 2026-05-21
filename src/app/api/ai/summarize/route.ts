// API Route: POST /api/ai/summarize
// 为指定邮件生成 AI 摘要 —— 即使 AI 调用失败也返回降级数据

import { NextRequest, NextResponse } from "next/server";
import type { UnifiedEmail } from "@/lib/api/types";

function fallbackSummary(email: Record<string, unknown> | undefined) {
  if (!email) {
    return { summary: "暂无内容", keyPoints: [] as string[], sentiment: "neutral" as const, requiresResponse: false };
  }
  const body = (email.body as Record<string, unknown> | undefined);
  // 优先用 plain，没有则尝试从 html 提取
  const text = (body?.plain as string) || (body?.html as string) || "";
  const cleaned = text.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return {
    summary: cleaned.slice(0, 50) + (cleaned.length > 50 ? "..." : ""),
    keyPoints: [] as string[],
    sentiment: "neutral" as const,
    requiresResponse: false,
  };
}

export async function POST(request: NextRequest) {
  // 先解析请求体，避免 catch 块中重复读取失败
  let requestData: Record<string, unknown> = {};
  try {
    requestData = await request.json();
  } catch {
    // 请求体解析失败，使用空对象
  }

  try {
    const email = requestData.email;

    if (!email || typeof email !== "object") {
      return NextResponse.json(
        { code: "INVALID_INPUT", message: "缺少邮件数据" },
        { status: 400 }
      );
    }

    const emailObj = email as Record<string, unknown>;
    const body = (emailObj.body as Record<string, unknown> | undefined) || {};
    const bodyPlain = (body.plain as string) || "";
    const bodyHtml = (body.html as string) || "";

    // 检查 body.plain 和 body.html，至少需要一个有内容
    const hasPlain = !!bodyPlain.trim();
    const hasHtml = !!bodyHtml.trim();
    if (!hasPlain && !hasHtml) {
      console.log("[ai/summarize] Email body is empty (no plain or html content), returning fallback for email:", emailObj.id);
      return NextResponse.json(fallbackSummary(emailObj));
    }

    // 如果 plain 为空但 html 有内容，尝试从 html 提取纯文本
    if (!hasPlain && hasHtml) {
      (emailObj as Record<string, unknown>).body = {
        plain: bodyHtml
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/?(p|div|li|h[1-6]|tr|blockquote)\b[^>]*>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#[0-9]+;/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim(),
        html: bodyHtml,
      };
      console.log("[ai/summarize] Converted HTML body to plain text for email:", emailObj.id);
    }

    // 检查 AI 环境变量
    const provider = process.env.AI_PROVIDER ?? process.env.NEXT_PUBLIC_AI_PROVIDER ?? "siliconflow";
    const apiKey = process.env.AI_API_KEY ?? process.env.NEXT_PUBLIC_AI_API_KEY ?? "";
    const baseUrl = process.env.AI_BASE_URL ?? process.env.NEXT_PUBLIC_AI_BASE_URL ?? "";
    const model = process.env.AI_MODEL ?? process.env.NEXT_PUBLIC_AI_MODEL ?? "";

    console.log("[ai/summarize] provider:", provider, "apiKey:", apiKey ? `present (${apiKey.length} chars)` : "EMPTY", "baseUrl:", baseUrl || "(default)", "model:", model || "(default)");

    // 动态导入 agent，避免构建时依赖
    const { generateSummary } = await import("@/lib/ai/agent");
    const summary = await generateSummary(emailObj as unknown as UnifiedEmail);
    console.log("[ai/summarize] summary generated:", summary.summary.slice(0, 30) + "...");
    return NextResponse.json(summary);
  } catch (error) {
    // 降级：返回邮件正文的截断版本
    console.error("[ai/summarize] Error:", error);
    return NextResponse.json(fallbackSummary(requestData.email as Record<string, unknown> | undefined));
  }
}
