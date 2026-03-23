import { claudeProvider } from "./providers/claude";
import { codexProvider } from "./providers/codex";

const providers = {
  claude: claudeProvider,
  codex: codexProvider,
};

const providerId = (import.meta.env.VITE_AI_CHAT_PROVIDER || "claude").toLowerCase();

export const activeProvider =
  providers[providerId as keyof typeof providers] || claudeProvider;
