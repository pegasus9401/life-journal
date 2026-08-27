import { google } from "@ai-sdk/google";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ToolLoopAgent, dynamicTool, isStepCount, jsonSchema } from "ai";
import { assistantToolDefinitions, executeAssistantTool } from "@/lib/ai/assistant-tools";
import { createPegasSystemPrompt } from "@/lib/ai/pegas-system-prompt";
import type { Persona } from "@/lib/ai/intelligence";

export const PEGAS_GEMINI_MODEL = "gemini-3.5-flash-lite";

type AgentContext = {
  supabase: SupabaseClient;
  user: User;
  today: string;
  persona: Persona;
  dailyContext: unknown;
  conversationId: string;
  onAction: (action: { tool: string; result: unknown }) => void;
};

export function createPegasAgent(context: AgentContext) {
  const tools = Object.fromEntries(
    assistantToolDefinitions.map((definition) => {
      const { name, description, parameters } = definition.function;
      return [name, dynamicTool({
        description,
        inputSchema: jsonSchema<Record<string, unknown>>(parameters),
        execute: async (input) => {
          const args = input as Record<string, unknown>;
          const result = await executeAssistantTool(name, args, context);
          const preview = { title: String(args.title ?? args.name ?? name), date: args.date ?? args.due_date ?? args.entry_date ?? args.workout_date ?? null, startTime: args.start_time ?? args.due_time ?? null };
          await context.supabase.from("ai_actions").insert({ owner_id: context.user.id, conversation_id: context.conversationId, tool_name: name, arguments: args, preview, status: "completed", result });
          context.onAction({ tool: name, result: { ...((result && typeof result === "object") ? result : { value: result }), preview } });
          return result;
        },
      })];
    }),
  );

  return new ToolLoopAgent({
    model: google(PEGAS_GEMINI_MODEL),
    instructions: createPegasSystemPrompt(context.today, context.persona, context.dailyContext),
    tools,
    maxOutputTokens: 600,
    stopWhen: isStepCount(5),
  });
}
