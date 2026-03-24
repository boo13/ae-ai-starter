<script lang="ts">
  import { onMount, tick } from "svelte";
  import { evalTS } from "../lib/utils/bolt";
  import { activeProvider } from "../lib/provider-config";
  import {
    clearAiAction,
    parseAiActionResponse,
    runAiAction,
    saveAiAction,
  } from "../lib/ai-action";
  import { buildContext } from "../lib/context";
  import ChatMessageComponent from "../components/ChatMessage.svelte";
  import ChatInput from "../components/ChatInput.svelte";
  import ActionBar from "../components/ActionBar.svelte";
  import type { ChatMessage } from "../lib/providers/provider";

  let messages: ChatMessage[] = $state([]);
  let isLoading: boolean = $state(false);
  let model: string = $state(activeProvider.models[0].value);
  let chatArea: HTMLDivElement | undefined = $state();
  let lastError: string = $state("");
  let pendingScreenshot: { path: string; fileName: string } | null = $state(null);
  let sessionProjectRoot: string | undefined = $state();
  let didInitializeAiAction: boolean = $state(false);
  let activeAbortController: AbortController | null = $state(null);

  function addMessage(
    role: ChatMessage["role"],
    content: string,
    extra?: { duration_ms?: number }
  ): number {
    messages.push({
      role,
      content,
      timestamp: Date.now(),
      ...extra,
    });
    scrollToBottom();
    return messages.length - 1;
  }

  function appendToMessage(index: number, chunk: string) {
    if (index >= 0 && index < messages.length) {
      messages[index].content += chunk;
      scrollToBottom();
    }
  }

  function handleCancel() {
    activeAbortController?.abort();
    activeAbortController = null;
  }

  async function scrollToBottom() {
    await tick();
    if (chatArea) {
      chatArea.scrollTop = chatArea.scrollHeight;
    }
  }

  async function handleSend(text: string) {
    const history = messages.slice();
    addMessage("user", text);
    isLoading = true;
    const imagePath = pendingScreenshot?.path;
    pendingScreenshot = null;

    const controller = new AbortController();
    activeAbortController = controller;

    // Index of the streaming assistant message slot (-1 = not yet created)
    let streamingIdx = -1;

    try {
      const context = await buildContext();
      sessionProjectRoot = context.projectRoot || sessionProjectRoot;

      if (!didInitializeAiAction && sessionProjectRoot) {
        clearAiAction(sessionProjectRoot);
        didInitializeAiAction = true;
      }

      const result = await activeProvider.sendMessage(
        text,
        {
          model,
          systemContext: context.systemContext,
          imagePath,
          projectRoot: context.projectRoot,
          signal: controller.signal,
          onChunk: (chunk) => {
            if (streamingIdx === -1) {
              streamingIdx = addMessage("assistant", chunk);
            } else {
              appendToMessage(streamingIdx, chunk);
            }
          },
        },
        history
      );

      if (result.is_error) {
        // Remove the partial streaming message if we got an error
        if (streamingIdx !== -1) {
          messages.splice(streamingIdx, 1);
          streamingIdx = -1;
        }
        addMessage("system", result.result, {
          duration_ms: result.duration_ms,
        });
        if (!result.cancelled) lastError = result.result;
      } else {
        const parsed = parseAiActionResponse(result.result);
        const displayText = parsed.displayText || "AI Action updated.";

        if (streamingIdx !== -1) {
          // Update the streamed message with the cleaned display text and duration
          messages[streamingIdx].content = displayText;
          messages[streamingIdx].duration_ms = result.duration_ms;
        } else {
          addMessage("assistant", displayText, {
            duration_ms: result.duration_ms,
          });
        }

        if (parsed.multipleBlocks) {
          addMessage("system", "Multiple AI Action blocks found — only the first was applied.");
        }

        if (parsed.scriptContent) {
          const saved = saveAiAction(context.projectRoot, parsed.scriptContent, displayText);
          addMessage("system", "AI Action ready: " + saved.summary);

          if (parsed.runImmediately) {
            const runResult = await runAiAction(context.projectRoot);
            if (runResult && "error" in runResult && runResult.error) {
              addMessage("system", "AI Action failed: " + runResult.error);
              lastError = String(runResult.error);
            } else {
              addMessage("system", "AI Action executed successfully.");
            }
          }
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (streamingIdx !== -1) {
        messages.splice(streamingIdx, 1);
      }
      addMessage("system", "Error: " + errMsg);
      lastError = errMsg;
    } finally {
      isLoading = false;
      activeAbortController = null;
    }
  }

  async function handleScreenshot() {
    isLoading = true;

    try {
      const timestamp = Date.now().toString();
      const result = await evalTS("takeScreenshot", timestamp);

      if (result && "error" in result && result.error) {
        addMessage("system", "Screenshot error: " + result.error);
      } else if (result && "path" in result && "fileName" in result) {
        pendingScreenshot = {
          path: result.path,
          fileName: result.fileName,
        };
        addMessage("system", "Screenshot captured: " + pendingScreenshot.fileName);
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      addMessage("system", "Screenshot failed: " + errMsg);
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
        if (result && "error" in result && result.error) {
          addMessage("system", "Analysis error: " + result.error);
          lastError = String(result.error);
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

    if (action.handler === "runAiAction") {
      try {
        if (!sessionProjectRoot) {
          const context = await buildContext();
          sessionProjectRoot = context.projectRoot || sessionProjectRoot;
        }

        const runResult = await runAiAction(sessionProjectRoot);
        if (runResult && "error" in runResult && runResult.error) {
          addMessage("system", "AI Action failed: " + runResult.error);
          lastError = String(runResult.error);
        } else {
          addMessage("system", "AI Action executed successfully.");
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        addMessage("system", "AI Action unavailable: " + errMsg);
      }
      return;
    }

    if (action.prompt) {
      await handleSend(action.prompt);
    }
  }

  onMount(() => {
    let disposed = false;

    buildContext()
      .then((context) => {
        if (disposed) return;
        sessionProjectRoot = context.projectRoot || sessionProjectRoot;
        if (!didInitializeAiAction && context.projectRoot) {
          clearAiAction(context.projectRoot);
          didInitializeAiAction = true;
        }
      })
      .catch(() => {});

    addMessage(
      "system",
      "AI Chat ready. Ask " + activeProvider.displayName + " about your After Effects project."
    );

    return () => {
      disposed = true;
      if (sessionProjectRoot) {
        clearAiAction(sessionProjectRoot);
      }
    };
  });
</script>

<div class="app">
  <header class="header">
    <span class="header__title">AI Chat</span>
    <div class="header__controls">
      {#if activeProvider.supportsImages}
        <button
          class="screenshot-btn"
          onclick={handleScreenshot}
          disabled={isLoading}
          title="Capture the current comp frame"
        >
          Shot
        </button>
      {/if}
      <select class="model-select" bind:value={model}>
        {#each activeProvider.models as providerModel}
          <option value={providerModel.value}>{providerModel.label}</option>
        {/each}
      </select>
    </div>
  </header>

  <div class="chat-area" bind:this={chatArea}>
    {#each messages as msg}
      <ChatMessageComponent
        assistantName={activeProvider.displayName}
        role={msg.role}
        content={msg.content}
        timestamp={msg.timestamp}
        duration_ms={msg.duration_ms}
      />
    {/each}
  </div>

  {#if pendingScreenshot}
    <div class="pending-screenshot">
      <span class="pending-screenshot__label">Attached: {pendingScreenshot.fileName}</span>
      <button class="pending-screenshot__clear" onclick={() => (pendingScreenshot = null)}>
        Clear
      </button>
    </div>
  {/if}

  <ActionBar disabled={isLoading} onclick={handleAction} />
  <ChatInput
    assistantName={activeProvider.displayName}
    disabled={isLoading}
    onsubmit={handleSend}
    oncancel={activeAbortController ? handleCancel : undefined}
  />
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
  .screenshot-btn {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #ccc;
    padding: 3px 8px;
    font-size: 11px;
    cursor: pointer;
  }
  .screenshot-btn:hover:not(:disabled) {
    background: #3a3a3a;
    border-color: #555;
  }
  .screenshot-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  .pending-screenshot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 12px;
    background: #2a2a2a;
    border-top: 1px solid #333;
    font-size: 11px;
    color: #4a9eff;
  }
  .pending-screenshot__clear {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 11px;
    padding: 0;
  }
  .pending-screenshot__clear:hover {
    color: #eee;
  }
</style>
