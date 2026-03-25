import Anthropic from "@anthropic-ai/sdk";
import { fs } from "../cep/node";
import type {
  ChatMessage,
  ProviderDefinition,
  ProviderResult,
  SendMessageOptions,
} from "./provider";

export function resolveApiKey(): string | null {
  // Check Node.js process.env first (set in shell before launching AE)
  try {
    if (typeof process !== "undefined" && process.env?.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }
  } catch {}

  // Fall back to localStorage (saved via settings UI)
  try {
    const stored = localStorage.getItem("ANTHROPIC_API_KEY");
    if (stored) return stored;
  } catch {}

  return null;
}

function buildImageBlock(
  imagePath: string
): Anthropic.ImageBlockParam | null {
  if (!fs) return null;
  try {
    const data = fs.readFileSync(imagePath);
    const base64 = Buffer.from(data).toString("base64");
    const ext = imagePath.split(".").pop()?.toLowerCase();
    const mediaType: Anthropic.Base64ImageSource["media_type"] =
      ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
    return {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 },
    };
  } catch {
    return null;
  }
}

async function sendClaudeMessage(
  prompt: string,
  options: SendMessageOptions,
  history: ChatMessage[]
): Promise<ProviderResult> {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    return {
      result: "No API key configured. Enter your Anthropic API key in settings.",
      duration_ms: 0,
      is_error: true,
    };
  }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const startTime = Date.now();

  // Build messages array from history (exclude system messages)
  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Add the current user message, optionally with an image
  if (options.imagePath) {
    const imageBlock = buildImageBlock(options.imagePath);
    if (imageBlock) {
      messages.push({
        role: "user",
        content: [imageBlock, { type: "text", text: prompt }],
      });
    } else {
      messages.push({ role: "user", content: prompt });
    }
  } else {
    messages.push({ role: "user", content: prompt });
  }

  try {
    const stream = client.messages.stream({
      model: options.model,
      max_tokens: 4096,
      system: options.systemContext,
      messages,
    });

    // Wire AbortSignal for user-initiated cancel
    if (options.signal) {
      options.signal.addEventListener(
        "abort",
        () => { stream.abort(); },
        { once: true }
      );
    }

    stream.on("text", (text) => {
      options.onChunk?.(text);
    });

    const final = await stream.finalMessage();
    const fullText = final.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      result: fullText.trim() || "(empty response)",
      duration_ms: Date.now() - startTime,
      is_error: false,
    };
  } catch (err: any) {
    if (options.signal?.aborted) {
      return {
        result: "Request cancelled.",
        duration_ms: Date.now() - startTime,
        is_error: true,
        cancelled: true,
      };
    }

    const message =
      err instanceof Anthropic.APIError
        ? `API error ${err.status}: ${err.message}`
        : err?.message || String(err);

    return {
      result: "Error: " + message,
      duration_ms: Date.now() - startTime,
      is_error: true,
    };
  }
}

export const claudeProvider: ProviderDefinition = {
  id: "claude",
  displayName: "Claude",
  models: [
    { value: "claude-haiku-4-5", label: "Haiku" },
    { value: "claude-sonnet-4-6", label: "Sonnet" },
    { value: "claude-opus-4-6", label: "Opus" },
  ],
  supportsImages: true,
  sendMessage: sendClaudeMessage,
};
