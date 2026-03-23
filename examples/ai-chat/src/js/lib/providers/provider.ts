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
}

export interface SendMessageOptions {
  model: string;
  systemContext: string;
  imagePath?: string;
  projectRoot?: string;
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
