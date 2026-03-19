import { child_process, fs, os, path } from "../lib/cep/node";

export interface CodexOptions {
  model: "gpt-5.4" | "o3" | "o1";
  systemContext: string;
  imagePath?: string;
}

export interface CodexResult {
  result: string;
  duration_ms: number;
  is_error: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  duration_ms?: number;
}

const MAX_HISTORY = 10;
const MAX_MSG_LENGTH = 500;

let _cachedCodexPath: string | null = null;

function findCodexPath(): string {
  if (_cachedCodexPath) return _cachedCodexPath;
  if (!fs) return "codex";

  const candidates = [
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    path.join(os.homedir(), ".local/bin/codex"),
  ];
  for (const p of candidates) {
    try {
      fs.accessSync(p);
      _cachedCodexPath = p;
      return p;
    } catch {}
  }

  return "codex";
}

function getCleanEnv(): Record<string, string> {
  const codexPath = findCodexPath();
  const codexDir = path.dirname(codexPath);
  return {
    HOME: os.homedir(),
    USER: os.userInfo()?.username || "user",
    PATH: [codexDir, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"].join(":"),
    TERM: "dumb",
    TMPDIR: os.tmpdir(),
  };
}

function buildConversationContext(history: ChatMessage[]): string {
  const recent = history
    .filter((m) => m.role !== "system")
    .slice(-MAX_HISTORY);

  if (recent.length === 0) return "";

  const lines = recent.map((m) => {
    const content =
      m.content.length > MAX_MSG_LENGTH
        ? m.content.substring(0, MAX_MSG_LENGTH) + "..."
        : m.content;
    return `${m.role === "user" ? "User" : "Assistant"}: ${content}`;
  });

  return "\n\n## Conversation History\n" + lines.join("\n\n");
}

export function sendMessage(
  prompt: string,
  options: CodexOptions,
  history: ChatMessage[]
): Promise<CodexResult> {
  return new Promise((resolve) => {
    if (!child_process || !child_process.spawn) {
      resolve({
        result: "Node.js not available. Are you running inside a CEP panel?",
        duration_ms: 0,
        is_error: true,
      });
      return;
    }

    const conversationCtx = buildConversationContext(history);
    const fullPrompt =
      options.systemContext +
      conversationCtx +
      "\n\n---\n\nUser request:\n" +
      prompt;

    const modelFlag = options.model;
    const timeout = 300000;
    const codexPath = findCodexPath();
    const cleanEnv = getCleanEnv();
    const startTime = Date.now();

    const args = ["exec", "-", "--model", modelFlag, "--ephemeral", "--skip-git-repo-check"];
    if (options.imagePath) {
      args.push("--image", options.imagePath);
    }

    const proc = child_process.spawn(
      codexPath,
      args,
      { env: cleanEnv, stdio: ["pipe", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill();
    }, timeout);

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      const duration_ms = Date.now() - startTime;

      if (killed) {
        resolve({
          result: "Codex didn't respond in time.",
          duration_ms,
          is_error: true,
        });
        return;
      }

      // The codex CLI output might include some headers/footers we want to strip
      // But for now, let's just take it as is, or maybe try to find the "codex" marker
      let result = stdout.trim();
      
      // Basic cleanup of codex TUI output if it leaks into stdout
      if (result.includes("\nuser\n")) {
         const parts = result.split("\nuser\n");
         if (parts.length > 1) {
            const afterUser = parts[1];
            if (afterUser.includes("\ncodex\n")) {
               result = afterUser.split("\ncodex\n")[1].split("\ntokens used\n")[0].trim();
            }
         }
      }

      if (code !== 0 && !result) {
        const raw = stderr || "Unknown error (exit code " + code + ")";
        resolve({
          result: "Error: " + raw.substring(0, 500),
          duration_ms,
          is_error: true,
        });
        return;
      }

      resolve({
        result: result || "(empty response)",
        duration_ms,
        is_error: false,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        result: "Failed to start Codex CLI: " + err.message,
        duration_ms: Date.now() - startTime,
        is_error: true,
      });
    });

    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}
