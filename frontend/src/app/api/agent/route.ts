// Main AI agent API route — non-streaming, handles tool calling via agentic loop
// POST /api/agent
// Body: { message, session_id, restaurant_id, language? }
// Response: { success, response, tool_calls, current_order, session_id, restaurant_id }

import { NextRequest, NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";
import type { SarvamAI } from "sarvamai";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateSession, deleteSession } from "./session";
import { buildTools, toFrontendOrder, updateConversationLog } from "./tools";
import { buildSystemPrompt } from "./prompts";

const MODEL = "sarvam-30b" as SarvamAI.SarvamModelIds;

function getSarvamClient() {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("Missing SARVAM_API_KEY env var");
  return new SarvamAIClient({ apiSubscriptionKey: apiKey });
}

async function fetchRestaurantName(restaurantId: string): Promise<string> {
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) return restaurantId;
    const sb = createClient(url, key);
    const { data } = await sb
      .from("restaurant")
      .select("restaurant_name")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    return data?.restaurant_name ?? restaurantId;
  } catch {
    return restaurantId;
  }
}

function buildToolDefs(
  executors: ReturnType<typeof buildTools>
): SarvamAI.ChatCompletionTool[] {
  return Object.entries(executors).map(([name, t]) => {
    // The Vercel AI tool wraps a zod schema — extract its JSON schema representation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyTool = t as any;
    const raw =
      anyTool.inputSchema?.jsonSchema ??
      anyTool.parameters?.jsonSchema ??
      { type: "object", properties: {} };
    // Strip $schema and additionalProperties — some LLM APIs reject these
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema, additionalProperties, ...parameters } = raw as Record<string, unknown>;
    return {
      type: "function" as const,
      function: { name, description: t.description ?? "", parameters },
    };
  });
}

// Agentic loop: call LLM → execute tool calls → repeat up to maxSteps
async function runAgentLoop(
  client: SarvamAIClient,
  systemPrompt: string,
  initialMessages: SarvamAI.ChatCompletionRequestMessage[],
  toolDefs: SarvamAI.ChatCompletionTool[],
  toolExecutors: ReturnType<typeof buildTools>,
  maxSteps = 5
): Promise<{ text: string; toolCallNames: string[] }> {
  // System prompt injected as first message
  const messages: SarvamAI.ChatCompletionRequestMessage[] = [
    { role: "system", content: systemPrompt } as SarvamAI.ChatCompletionRequestMessage,
    ...initialMessages,
  ];
  const toolCallNames: string[] = [];
  let finalText = "";

  for (let step = 0; step < maxSteps; step++) {
    const response = await client.chat.completions({
      model: MODEL,
      messages,
      tools: toolDefs,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 2048,
    });

    const choice = response.choices?.[0];
    if (!choice) break;

    const msg = choice.message;
    finalText = msg.content ?? "";

    if (!msg.tool_calls?.length) break;

    // Add assistant turn to messages
    messages.push({ role: "assistant", content: finalText, tool_calls: msg.tool_calls } as SarvamAI.ChatCompletionRequestMessage);

    // Execute each tool call and add results
    for (const tc of msg.tool_calls) {
      toolCallNames.push(tc.function.name);
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments ?? "{}"); } catch { /* ignore */ }

      const executor = toolExecutors[tc.function.name as keyof typeof toolExecutors];
      let result: unknown = { error: `Unknown tool: ${tc.function.name}` };
      if (executor) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result = await (executor as any).execute(args);
        } catch (e) {
          result = { error: String(e) };
        }
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      } as SarvamAI.ChatCompletionRequestMessage);
    }
  }

  return { text: finalText, toolCallNames };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      session_id,
      restaurant_id,
      language = "hi-IN",
    } = body as {
      message: string;
      session_id: string;
      restaurant_id: string;
      language?: string;
    };

    if (!message || !session_id || !restaurant_id) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const session = getOrCreateSession(session_id, restaurant_id, restaurant_id, language);
    if (session.restaurant_name === restaurant_id) {
      session.restaurant_name = await fetchRestaurantName(restaurant_id);
    }

    const systemPrompt = buildSystemPrompt(restaurant_id, session.restaurant_name);
    const toolExecutors = buildTools(session_id);
    const toolDefs = buildToolDefs(toolExecutors);

    session.conversation_history.push({ role: "user", content: message });

    const messages = session.conversation_history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })) as SarvamAI.ChatCompletionRequestMessage[];

    const client = getSarvamClient();
    const { text, toolCallNames } = await runAgentLoop(
      client, systemPrompt, messages, toolDefs, toolExecutors
    );

    session.conversation_history.push({ role: "assistant", content: text });

    updateConversationLog(session_id, {
      timestamp: new Date().toISOString(),
      customer_message: message,
      ai_response: text,
      tool_calls: toolCallNames.map((name) => ({ tool: name, args: {} })),
    }).catch(console.error);

    return NextResponse.json({
      success: true,
      response: text,
      tool_calls: toolCallNames,
      current_order: toFrontendOrder(session_id),
      session_id,
      restaurant_id,
    });
  } catch (e) {
    console.error("[POST /api/agent] error:", e);
    return NextResponse.json(
      { success: false, error: String(e), response: "Sorry, something went wrong." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get("session_id");
  if (!session_id) {
    return NextResponse.json({ success: false, message: "Missing session_id" }, { status: 400 });
  }
  const deleted = deleteSession(session_id);
  return NextResponse.json({
    success: deleted,
    message: deleted ? "Session cleared" : "Session not found",
  });
}
