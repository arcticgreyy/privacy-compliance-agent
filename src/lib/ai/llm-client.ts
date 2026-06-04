import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export type LLMProvider = "anthropic" | "openai" | "gemini";

interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage?: { promptTokens: number; completionTokens: number };
}

function getProvider(): LLMProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GOOGLE_GEMINI_API_KEY) return "gemini";
  throw new Error(
    "No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GEMINI_API_KEY."
  );
}

async function callAnthropic(
  systemPrompt: string,
  userMessage: string
): Promise<LLMResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    temperature: 0.1,
    system: systemPrompt + "\n\nYou must respond with valid JSON only. No markdown, no explanation — just the JSON.",
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return {
    content: textBlock?.text ?? "{}",
    provider: "anthropic",
    model,
    usage: {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
    },
  };
}

async function callOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<LLMResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.1,
    max_tokens: 4096,
  });

  const choice = response.choices[0];
  return {
    content: choice.message.content ?? "{}",
    provider: "openai",
    model,
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
        }
      : undefined,
  };
}

async function callGemini(
  systemPrompt: string,
  userMessage: string
): Promise<LLMResponse> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";

  const generativeModel = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  });

  const result = await generativeModel.generateContent(userMessage);
  const response = result.response;

  return {
    content: response.text(),
    provider: "gemini",
    model,
    usage: response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
        }
      : undefined,
  };
}

export async function queryLLM(
  systemPrompt: string,
  userMessage: string
): Promise<LLMResponse> {
  const provider = getProvider();

  switch (provider) {
    case "anthropic":
      return callAnthropic(systemPrompt, userMessage);
    case "openai":
      return callOpenAI(systemPrompt, userMessage);
    case "gemini":
      return callGemini(systemPrompt, userMessage);
  }
}

export function safeParseJSON<T>(raw: string): T | null {
  try {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
