export interface QuickAction {
  label: string;
  icon: string;
  prompt?: string;
  handler?: string;
}

export const quickActions: QuickAction[] = [
  {
    label: "Run Analysis",
    icon: "\uD83D\uDD0D",
    handler: "runAnalysis",
  },
  {
    label: "Describe Comp",
    icon: "\uD83D\uDCCB",
    prompt:
      "Describe the active composition's structure, layers, and expressions in detail.",
  },
  {
    label: "Fix Last Error",
    icon: "\uD83D\uDD27",
    handler: "fixLastError",
  },
  {
    label: "AI Action",
    icon: "\u2699",
    handler: "runAiAction",
  },
];
