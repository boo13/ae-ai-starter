import { child_process, fs, os, path } from "../lib/cep/node";

export interface ClaudeOptions {
  model: "sonnet" | "opus";
  systemContext: string;
}

export interface ClaudeResult {
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

// Cache the resolved claude path so we only scan the filesystem once
let _cachedClaudePath: string | null = null;

function findClaudePath(): string {
  if (_cachedClaudePath) return _cachedClaudePath;
  if (!fs) return "claude";

  // Check NVM directory for any node version that has claude
  const nvmBase = path.join(os.homedir(), ".nvm/versions/node");
  try {
    const versions = fs.readdirSync(nvmBase);
    for (let i = versions.length - 1; i >= 0; i--) {
      const p = path.join(nvmBase, versions[i], "bin/claude");
      try {
        fs.accessSync(p);
        _cachedClaudePath = p;
        return p;
      } catch {}
    }
  } catch {}

  // Check other common locations
  const candidates = [
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    path.join(os.homedir(), ".local/bin/claude"),
  ];
  for (const p of candidates) {
    try {
      fs.accessSync(p);
      _cachedClaudePath = p;
      return p;
    } catch {}
  }

  return "claude";
}

// Build a minimal clean env — strips CEP's ELECTRON_RUN_AS_NODE etc.
function getCleanEnv(): Record<string, string> {
  const claudePath = findClaudePath();
  const claudeDir = path.dirname(claudePath);
  return {
    HOME: os.homedir(),
    USER: os.userInfo().username,
    PATH: [claudeDir, "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin"].join(":"),
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
  options: ClaudeOptions,
  history: ChatMessage[]
): Promise<ClaudeResult> {
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

    const modelFlag = options.model === "opus" ? "opus" : "sonnet";
    const timeout = options.model === "opus" ? 300000 : 120000;
    const claudePath = findClaudePath();
    const cleanEnv = getCleanEnv();
    const startTime = Date.now();

    const proc = child_process.spawn(
      claudePath,
      ["--print", "--model", modelFlag],
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
          result: "Claude didn't respond in time. Try again or use a faster model.",
          duration_ms,
          is_error: true,
        });
        return;
      }

      // Prefer stdout if it has real content, even on non-zero exit
      if (stdout.trim().length > 10) {
        resolve({
          result: stdout.trim(),
          duration_ms,
          is_error: code !== 0 && !stdout.trim(),
        });
        return;
      }

      if (code !== 0) {
        const raw = stderr || "Unknown error (exit code " + code + ")";
        const errLines = raw
          .split("\n")
          .filter((l: string) => l.trim() && !l.startsWith("    at "))
          .slice(0, 5);
        const errMsg = errLines.join("\n").substring(0, 500) || "Unknown error";

        resolve({
          result: "Error: " + errMsg,
          duration_ms,
          is_error: true,
        });
        return;
      }

      resolve({
        result: stdout.trim() || "(empty response)",
        duration_ms,
        is_error: false,
      });
    });

    proc.on("error", (err: Error) => {
      clearTimeout(timer);
      resolve({
        result: "Failed to start Claude CLI: " + err.message,
        duration_ms: Date.now() - startTime,
        is_error: true,
      });
    });

    // Pipe prompt directly to stdin — no temp file, no shell
    proc.stdin.write(fullPrompt);
    proc.stdin.end();
  });
}
