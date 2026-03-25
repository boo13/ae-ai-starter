export interface QuickAction {
  label: string;
  icon: string;
  prompt?: string;
  handler?: string;
}

export const quickActions: QuickAction[] = [];
