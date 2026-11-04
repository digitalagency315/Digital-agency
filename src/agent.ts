import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "./config";
import { log, maskNumber } from "./logger";
import { buildSystemPrompt } from "./prompt";
import type { UserState } from "./store";
import { executeTool, Outbox, ToolDeps, TOOLS } from "./tools";

type BMessageParam = Anthropic.Beta.Messages.BetaMessageParam;
type BMessage = Anthropic.Beta.Messages.BetaMessage;
type BCreateParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;

export const MAX_TOOL_ROUNDS = 2;

/** Minimal surface of the Anthropic client we use (lets tests inject a fake). */
export interface LLM {
  create(params: BCreateParams): Promise<BMessage>;
}

export function anthropicLLM(apiKey: string): LLM {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 45_000 });
  return { create: (p) => client.beta.messages.create(p) };
}

export interface AgentResult {
  text: string;
  outbox: Outbox;
  /** true when we had to give up (tool-loop limit / refusal / empty) and should send the fallback menu */
  fallback: boolean;
}

/** Turn stored history into a valid alternating user/assistant list that starts with a user turn. */
export function historyToMessages(user: UserState): BMessageParam[] {
  const out: BMessageParam[] = [];
  for (const t of user.history) {
    const last = out[out.length - 1];
    if (last && last.role === t.role) {
      last.content = `${last.content as string}\n${t.text}`;
    } else {
      out.push({ role: t.role, content: t.text });
    }
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

export class Agent {
  constructor(private cfg: Config, private llm: LLM, private deps: ToolDeps) {}

  /**
   * Run Claude with tools for one inbound message. `user.history` must already contain the new
   * user turn. Max 2 tool rounds; on the 3rd tool request we stop and fall back.
   * Throws on API errors (caller sends the menu + "Team jaldi reply karega").
   */
  async run(user: UserState): Promise<AgentResult> {
    const outbox: Outbox = { menu: false, image: null, handoff: false };
    const messages = historyToMessages(user);
    if (!messages.length) return { text: "", outbox, fallback: true };

    let rounds = 0;
    for (;;) {
      const fresh = this.deps.store.getUser(user.number) || user;
      const params: BCreateParams = {
        model: this.cfg.claudeModel,
        max_tokens: 2048,
        system: buildSystemPrompt(this.cfg.businessFile, fresh),
        tools: TOOLS,
        tool_choice: { type: "auto" },
        output_config: { effort: this.cfg.claudeEffort },
        messages,
      };
      if (this.cfg.claudeFallbacks) {
        // Server-side refusal fallback: if a safety classifier declines, the API retries on a fallback model.
        params.betas = ["server-side-fallback-2026-07-01"];
        params.fallbacks = "default";
      }
      const res = await this.llm.create(params);
      log.info("claude_response", { user: maskNumber(user.number), stop: res.stop_reason, round: rounds, usage: res.usage && { in: res.usage.input_tokens, out: res.usage.output_tokens } });

      if (res.stop_reason === "refusal") return { text: "", outbox, fallback: true };

      const toolUses = res.content.filter((b): b is Anthropic.Beta.Messages.BetaToolUseBlock => b.type === "tool_use");
      const text = res.content
        .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (res.stop_reason !== "tool_use" || !toolUses.length) {
        return { text, outbox, fallback: !text && !outbox.image && !outbox.menu };
      }

      if (rounds >= MAX_TOOL_ROUNDS) {
        log.warn("tool_loop_limit", { user: maskNumber(user.number) });
        return { text: "", outbox, fallback: true };
      }
      rounds++;

      // Keep the assistant turn exactly as returned (thinking/fallback blocks included).
      messages.push({ role: "assistant", content: res.content });
      const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const current = this.deps.store.getUser(user.number) || user;
        const r = await executeTool(tu.name, (tu.input || {}) as Record<string, unknown>, this.deps, current, outbox);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: r.result, ...(r.isError ? { is_error: true } : {}) });
      }
      messages.push({ role: "user", content: results });
    }
  }
}
