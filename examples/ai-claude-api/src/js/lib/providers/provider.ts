export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  duration_ms?: number;
}

export interface ProviderResult {
  result: string;
  duration_ms: number;
  is_error: boolean;
  cancelled?: boolean;
}

export interface SendMessageOptions {
  model: string;
  systemContext: string;
  imagePath?: string;
  projectRoot?: string;
  signal?: AbortSignal;
  onChunk?: (chunk: string) => void;
}

export interface ProviderModel {
  value: string;
  label: string;
}

export interface ProviderDefinition {
  id: string;
  displayName: string;
  models: ProviderModel[];
  supportsImages: boolean;
  sendMessage: (
    prompt: string,
    options: SendMessageOptions,
    history: ChatMessage[]
  ) => Promise<ProviderResult>;
}
