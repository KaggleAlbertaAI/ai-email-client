// AI 邮件智能体核心逻辑
// 提供邮件摘要生成与智能回复建议，支持国内大模型 API（硅基流动、DeepSeek 等）

import type { UnifiedEmail } from "@/lib/api/types";

// ---------------------------------------------------------------------------
//  大模型提供商配置
// ---------------------------------------------------------------------------

export type AIProvider = "siliconflow" | "deepseek" | "openai-compatible";

export interface AIProviderConfig {
  /** 提供商类型 */
  provider: AIProvider;
  /** API Key —— 从环境变量 NEXT_PUBLIC_AI_API_KEY 读取 */
  apiKey: string;
  /** API 基础 URL */
  baseUrl: string;
  /** 使用模型 */
  model: string;
}

/**
 * 获取 AI 提供商配置
 *
 * 通过环境变量切换模型，默认使用硅基流动的 DeepSeek-V3
 * 可在 .env.local 中配置：
 *   NEXT_PUBLIC_AI_PROVIDER=siliconflow
 *   NEXT_PUBLIC_AI_API_KEY=sk-xxx
 *   NEXT_PUBLIC_AI_BASE_URL=https://api.siliconflow.cn/v1
 *   NEXT_PUBLIC_AI_MODEL=deepseek-ai/DeepSeek-V3
 */
function getProviderConfig(): AIProviderConfig {
  const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER ?? "siliconflow") as AIProvider;

  const configs: Record<AIProvider, Omit<AIProviderConfig, "apiKey">> = {
    siliconflow: {
      provider: "siliconflow",
      baseUrl: "https://api.siliconflow.cn/v1",
      model: "deepseek-ai/DeepSeek-V3",
    },
    deepseek: {
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    },
    "openai-compatible": {
      provider: "openai-compatible",
      baseUrl: process.env.NEXT_PUBLIC_AI_BASE_URL ?? "",
      model: process.env.NEXT_PUBLIC_AI_MODEL ?? "",
    },
  };

  const cfg = configs[provider];
  return {
    ...cfg,
    apiKey: process.env.NEXT_PUBLIC_AI_API_KEY ?? "",
  };
}

// ---------------------------------------------------------------------------
//  LLM 调用封装
// ---------------------------------------------------------------------------

interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

/**
 * 调用大模型 Chat Completions API
 * 统一封装 fetch 请求结构，各提供商接口兼容 OpenAI 格式
 */
async function chatCompletion(
  config: AIProviderConfig,
  messages: ChatCompletionRequest["messages"],
  options: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const { temperature = 0.3, maxTokens = 500, jsonMode = false } = options;

  const body: ChatCompletionRequest = {
    model: config.model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode && { response_format: { type: "json_object" } }),
  };

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `AI API 请求失败: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`
    );
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("AI API 返回了无效响应");
  }

  return data.choices[0].message.content;
}

// ---------------------------------------------------------------------------
//  邮件摘要提取工具函数
// ---------------------------------------------------------------------------

/** 提取邮件核心上下文，过滤签名和引用部分 */
function extractMailContext(email: UnifiedEmail): string {
  let text = email.body.plain;

  // 去除常见邮件签名和引用标记
  text = text.replace(/^-+\s*$/gm, "").trim(); // 分隔线
  text = text.replace(/^(发件人|From|发送时间|Date|> ).*$/gm, "").trim(); // 引用头

  return text;
}

// ---------------------------------------------------------------------------
//  核心功能 1：生成邮件摘要
// ---------------------------------------------------------------------------

export interface EmailSummary {
  /** 50 字以内的中文摘要 */
  summary: string;
  /** 关键要点列表 */
  keyPoints: string[];
  /** 情感倾向 */
  sentiment: "positive" | "neutral" | "negative";
  /** 是否需要回复 */
  requiresResponse: boolean;
}

/**
 * 为邮件生成 50 字以内的中文结构化摘要
 *
 * 使用 JSON 格式输出，包含摘要、要点、情感和是否需要回复四个字段
 */
export async function generateSummary(email: UnifiedEmail): Promise<EmailSummary> {
  // 如果已有缓存的 AI 数据，直接返回
  if (email.ai?.summary) {
    return {
      summary: email.ai.summary,
      keyPoints: email.ai.keyPoints ?? [],
      sentiment: email.ai.sentiment ?? "neutral",
      requiresResponse: email.ai.requiresResponse ?? false,
    };
  }

  const config = getProviderConfig();
  const context = extractMailContext(email);

  const systemPrompt = `你是一个专业的邮件助手。请根据用户提供的邮件内容，生成结构化的中文摘要。

输出要求：
1. summary：50 字以内的中文摘要，提炼邮件核心内容
2. keyPoints：2-4 个关键要点，每点不超过 20 字
3. sentiment：情感倾向，值为 positive、neutral 或 negative
4. requiresResponse：是否需要收件人回复（布尔值）

请严格按照 JSON 格式输出，不要添加任何其他文字。`;

  const userPrompt = `发件人：${email.sender.name ?? email.sender.email}
收件人：${email.recipients.map((r) => r.name ?? r.email).join(", ")}
主题：${email.subject}

正文：
${context}`;

  const raw = await chatCompletion(
    config,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, maxTokens: 300, jsonMode: true }
  );

  try {
    const parsed = JSON.parse(raw) as {
      summary: string;
      keyPoints: string[];
      sentiment: "positive" | "neutral" | "negative";
      requiresResponse: boolean;
    };

    return {
      summary: parsed.summary.slice(0, 50), // 确保不超过 50 字
      keyPoints: parsed.keyPoints ?? [],
      sentiment: parsed.sentiment ?? "neutral",
      requiresResponse: parsed.requiresResponse ?? false,
    };
  } catch {
    // JSON 解析失败时降级为简单摘要
    return {
      summary: context.slice(0, 50) + (context.length > 50 ? "..." : ""),
      keyPoints: [],
      sentiment: "neutral",
      requiresResponse: false,
    };
  }
}

// ---------------------------------------------------------------------------
//  核心功能 2：生成智能回复建议
// ---------------------------------------------------------------------------

export interface ReplyDraft {
  /** 回复内容 */
  content: string;
  /** 语气类型 */
  tone: "professional" | "friendly" | "concise";
}

/**
 * 根据邮件内容和指定语气，生成 3 条候选回复草稿
 *
 * 支持三种语气：professional（专业）、friendly（友好）、concise（简洁）
 */
export async function generateReply(
  email: UnifiedEmail,
  tone: "professional" | "friendly" | "concise" = "professional"
): Promise<ReplyDraft[]> {
  const config = getProviderConfig();
  const context = extractMailContext(email);

  const toneDescriptions: Record<string, string> = {
    professional: "正式、专业的语气，适合工作场合和商务沟通",
    friendly: "友好、亲切的语气，适合日常沟通和熟人交流",
    concise: "简洁、直接的语气，适合快速回复和简短确认",
  };

  const systemPrompt = `你是一个邮件回复助手。请根据用户提供的邮件内容，生成 3 条不同风格的中文回复草稿。

输出要求：
1. 每条回复需符合指定的语气风格：${toneDescriptions[tone]}
2. 每条回复控制在 100 字以内
3. 3 条回复应当在表达方式上有所区别，但核心信息一致
4. 严格按照 JSON 数组格式输出

返回格式：
[
  { "tone": "professional", "content": "回复内容" },
  { "tone": "friendly", "content": "回复内容" },
  { "tone": "concise", "content": "回复内容" }
]

不要添加任何其他文字。`;

  const userPrompt = `发件人：${email.sender.name ?? email.sender.email}
主题：${email.subject}

邮件正文：
${context}

请基于以上内容生成回复。`;

  const raw = await chatCompletion(
    config,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.7, maxTokens: 500, jsonMode: true }
  );

  try {
    const parsed = JSON.parse(raw) as Array<{
      tone: string;
      content: string;
    }>;

    const toneMap: Record<string, "professional" | "friendly" | "concise"> = {
      professional: "professional",
      friendly: "friendly",
      concise: "concise",
      formal: "professional",
      casual: "friendly",
      brief: "concise",
    };

    return parsed.slice(0, 3).map((item, index) => ({
      content: item.content.slice(0, 100), // 确保不超过 100 字
      tone: toneMap[item.tone] ?? (["professional", "friendly", "concise"][index] as ReplyDraft["tone"]),
    }));
  } catch {
    // JSON 解析失败时返回降级内容
    return [
      {
        content: `感谢您的邮件，我会尽快处理。`,
        tone: "professional" as const,
      },
      {
        content: `谢谢你的来信，我会尽快回复你！`,
        tone: "friendly" as const,
      },
      {
        content: `收到，谢谢。`,
        tone: "concise" as const,
      },
    ];
  }
}

// ---------------------------------------------------------------------------
//  批量摘要生成 —— 用于邮件列表批量处理
// ---------------------------------------------------------------------------

/**
 * 批量为多封邮件生成摘要
 * 串行调用避免 API 限流，适合列表页预加载场景
 */
export async function generateSummariesBatch(
  emails: UnifiedEmail[]
): Promise<Map<string, EmailSummary>> {
  const results = new Map<string, EmailSummary>();

  for (const email of emails) {
    try {
      const summary = await generateSummary(email);
      results.set(email.id, summary);
    } catch {
      // 单封邮件摘要失败不影响其他邮件
      results.set(email.id, {
        summary: email.body.plain.slice(0, 50) + "...",
        keyPoints: [],
        sentiment: "neutral",
        requiresResponse: false,
      });
    }
  }

  return results;
}
