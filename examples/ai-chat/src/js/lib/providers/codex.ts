import { child_process, fs, os, path } from "../cep/node";
import {
  buildFullPrompt,
  buildProviderEnv,
  findGitRoot,
  resolveWorkingDirectory,
  summarizeProcessError,
} from "./shared";
import type {
  ChatMessage,
  ProviderDefinition,
  ProviderResult,
  SendMessageOptions,
} from "./provider";

let cachedCodexPath: string | null = null;

function findCodexPath(): string {
  if (cachedCodexPath) return cachedCodexPath;
  if (!fs) return "codex";

  const candidates = [
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    path.join(os.homedir(), ".local/bin/codex"),
  ];

  for (const candidate of candidates) {
    try {
      fs.accessSync(candidate);
      cachedCodexPath = candidate;
      return candidate;
    } catch {}
  }

  return "codex";
}

function getCleanEnv(): Record<string, string> {
  const codexPath = findCodexPath();
  return buildProviderEnv(
    path.dirname(codexPath),
    os.homedir(),
    os.userInfo()?.username || "user",
    os.tmpdir()
  );
}

function shouldSkipGitRepoCheck(projectRoot?: string): boolean {
  return !findGitRoot(projectRoot);
}

async function sendCodexMessage(
  prompt: string,
  options: SendMessageOptions,
  history: ChatMessage[]
): Promise<ProviderResult> {
  return new Promise((resolve) => {
    if (!child_process || !child_process.spawn) {
      resolve({
        result: "Node.js not available. Are you running inside a CEP panel?",
        duration_ms: 0,
        is_error: true,
      });
      return;
    }

    const fullPrompt = buildFullPrompt(options.systemContext, prompt, history);
    const startTime = Date.now();
    const args = [
      "exec",
      "-",
      "--model",
      options.model,
      "--ephemeral",
    ];

    if (shouldSkipGitRepoCheck(options.projectRoot)) {
      args.push("--skip-git-repo-check");
    }

    if (options.imagePath) {
      args.push("--image", options.imagePath);
    }

    const proc = child_process.spawn(
      findCodexPath(),
      args,
      {
        cwd: resolveWorkingDirectory(options.projectRoot) || os.homedir(),
        env: getCleanEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";
    let killed = false;
    let cancelled = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill();
    }, 300000);

    // Wire AbortSignal for user-initiated cancel
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        cancelled = true;
        clearTimeout(timer);
        proc.kill();
      });
    }

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      const duration_ms = Date.now() - startTime;

      if (cancelled) {
        resolve({
          result: "Request cancelled.",
          duration_ms,
          is_error: true,
        });
        return;
      }

      if (killed) {
        resolve({
          result: "Codex didn't respond in time.",
          duration_ms,
          is_error: true,
        });
        return;
      }

      let result = stdout.trim();

      if (result.includes("\nuser\n")) {
        const parts = result.split("\nuser\n");
        if (parts.length > 1) {
          const afterUser = parts[1];
          if (afterUser.includes("\ncodex\n")) {
            result = afterUser.split("\ncodex\n")[1].split("\ntokens used\n")[0].trim();
          }
        }
      }

      if (code !== 0) {
        const summary = summarizeProcessError(stderr, code);
        resolve({
          result: result
            ? "Error: Codex exited before completing the request.\n\nPartial output:\n" +
              result +
              "\n\n" +
              summary
            : "Error: " + summary,
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

export const codexProvider: ProviderDefinition = {
  id: "codex",
  displayName: "Codex",
  models: [
    { value: "gpt-5.4", label: "GPT-5.4" },
    { value: "o3", label: "o3" },
    { value: "o1", label: "o1" },
  ],
  supportsImages: true,
  sendMessage: sendCodexMessage,
};
