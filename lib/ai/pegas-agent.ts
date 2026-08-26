import { google } from "@ai-sdk/google";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ToolLoopAgent, dynamicTool, isStepCount, jsonSchema } from "ai";
import { assistantToolDefinitions, executeAssistantTool } from "@/lib/ai/assistant-tools";
import { createPegasSystemPrompt } from "@/lib/ai/pegas-system-prompt";

export const PEGAS_GEMINI_MODEL = "gemini-3.7-flash";

type AgentContext = {
  supabase: SupabaseClient;
  user: User;
  today: string;
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
          const result = await executeAssistantTool(name, input as Record<string, unknown>, context);
          context.onAction({ tool: name, result });
          return result;
        },
      })];
    }),
  );

  return new ToolLoopAgent({
    model: google(PEGAS_GEMINI_MODEL),
    instructions: createPegasSystemPrompt(context.today),
    tools,
    stopWhen: isStepCount(6),
  });
}

