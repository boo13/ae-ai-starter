<script lang="ts">
  import { onMount, tick } from "svelte";
  import { evalTS } from "../lib/utils/bolt";
  import { sendMessage, type ChatMessage } from "../lib/claude";
  import { buildContext } from "../lib/context";
  import ChatMessageComponent from "../components/ChatMessage.svelte";
  import ChatInput from "../components/ChatInput.svelte";
  import ActionBar from "../components/ActionBar.svelte";

  let messages: ChatMessage[] = $state([]);
  let isLoading: boolean = $state(false);
  let model: "sonnet" | "opus" = $state("sonnet");
  let chatArea: HTMLDivElement | undefined = $state();
  let lastError: string = $state("");

  function addMessage(
    role: ChatMessage["role"],
    content: string,
    extra?: { duration_ms?: number }
  ) {
    messages.push({
      role,
      content,
      timestamp: Date.now(),
      ...extra,
    });
    scrollToBottom();
  }

  async function scrollToBottom() {
    await tick();
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  async function handleSend(text: string) {
    addMessage("user", text);
    isLoading = true;

    try {
      const context = await buildContext();
      const result = await sendMessage(
        text,
        { model, systemContext: context },
        messages
      );

      addMessage("assistant", result.result, {
        duration_ms: result.duration_ms,
      });

      if (result.is_error) {
        lastError = result.result;
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      addMessage("system", "Error: " + errMsg);
      lastError = errMsg;
    } finally {
      isLoading = false;
    }
  }

  async function handleAction(action: {
    label: string;
    prompt?: string;
    handler?: string;
  }) {
    if (action.handler === "runAnalysis") {
      addMessage("system", "Running analysis...");
      isLoading = true;
      try {
        const result = await evalTS("runAnalysisScript");
        if ((result as any).error) {
          addMessage("system", "Analysis error: " + (result as any).error);
          lastError = (result as any).error;
        } else {
          addMessage(
            "system",
            "Analysis complete. Context updated for next message."
          );
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        addMessage("system", "Analysis failed: " + errMsg);
        lastError = errMsg;
      } finally {
        isLoading = false;
      }
      return;
    }

    if (action.handler === "fixLastError") {
      if (!lastError) {
        addMessage("system", "No recent error to fix.");
        return;
      }
      await handleSend(
        "Diagnose this error and suggest or implement a fix:\n\n" + lastError
      );
      return;
    }

    if (action.handler === "runLastScript") {
      addMessage("system", "Run Last Script is not yet available in V1.");
      return;
    }

    if (action.prompt) {
      await handleSend(action.prompt);
    }
  }

  onMount(() => {
    addMessage(
      "system",
      "AI Chat ready. Ask Claude about your After Effects project."
    );
  });
</script>

<div class="app">
  <header class="header">
    <span class="header__title">AI Chat</span>
    <div class="header__controls">
      <select class="model-select" bind:value={model}>
        <option value="sonnet">Sonnet</option>
        <option value="opus">Opus</option>
      </select>
    </div>
  </header>

  <div class="chat-area" bind:this={chatArea}>
    {#each messages as msg}
      <ChatMessageComponent
        role={msg.role}
        content={msg.content}
        timestamp={msg.timestamp}
        duration_ms={msg.duration_ms}
      />
    {/each}
  </div>

  <ActionBar disabled={isLoading} onclick={handleAction} />
  <ChatInput disabled={isLoading} onsubmit={handleSend} />
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      sans-serif;
    background: #232323;
    color: #d4d4d4;
    overflow: hidden;
  }
  :global(*) {
    box-sizing: border-box;
  }
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #232323;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #1a1a1a;
    border-bottom: 1px solid #333;
    flex-shrink: 0;
  }
  .header__title {
    font-size: 13px;
    font-weight: 600;
    color: #eee;
  }
  .header__controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .model-select {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #ccc;
    padding: 3px 6px;
    font-size: 11px;
    cursor: pointer;
  }
  .model-select:focus {
    outline: none;
    border-color: #4a9eff;
  }
  .chat-area {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }
  .chat-area::-webkit-scrollbar {
    width: 6px;
  }
  .chat-area::-webkit-scrollbar-track {
    background: transparent;
  }
  .chat-area::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 3px;
  }
</style>
