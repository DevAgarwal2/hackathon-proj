// Streaming AI agent route — SSE token-by-token LLM output via OpenRouter API
// POST /api/agent/stream
// Body: { message, session_id, restaurant_id, language? }
// Response: SSE stream  →  data: "token"\n\n  per token
//                       →  data: [ORDER]{...}\n\n  at the end

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOrCreateSession } from "../session";
import { buildTools, toFrontendOrder, updateConversationLog } from "../tools";
import { buildSystemPrompt } from "../prompts";

const MODEL = "stepfun/step-3.5-flash:free";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY env var");
  return apiKey;
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

function buildToolDefs(executors: ReturnType<typeof buildTools>) {
  return Object.entries(executors).map(([name, t]) => {
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
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = getOrCreateSession(session_id, restaurant_id, restaurant_id, language);
    if (session.restaurant_name === restaurant_id) {
      session.restaurant_name = await fetchRestaurantName(restaurant_id);
    }

    const systemPrompt = buildSystemPrompt(restaurant_id, session.restaurant_name);
    const toolExecutors = buildTools(session_id);
    const toolDefs = buildToolDefs(toolExecutors);

    session.conversation_history.push({ role: "user", content: message });

    type Message = 
      | { role: "system" | "user" | "assistant"; content: string }
      | { role: "assistant"; content: string | null; tool_calls: { id: string; type: string; function: { name: string; arguments: string } }[] }
      | { role: "tool"; tool_call_id: string; content: string };

    const baseMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...session.conversation_history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const encoder = new TextEncoder();
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();

    // Run the agentic loop asynchronously, streaming text tokens to the client
    (async () => {
      const messages: Message[] = [...baseMessages];
      const toolCallNames: string[] = [];
      let finalText = "";

      try {
        for (let step = 0; step < 5; step++) {
          console.log(`[stream] step=${step}, messages=${messages.length}`);

          const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${getOpenRouterApiKey()}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost:3000",
              "X-Title": "Restaurant Voice Agent",
            },
            body: JSON.stringify({
              model: MODEL,
              messages,
              tools: toolDefs,
              tool_choice: "auto",
              temperature: 0.3,
              max_tokens: 2048,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          // Collect streamed chunks
          let stepText = "";
          const stepToolCalls: { id: string; type: string; function: { name: string; arguments: string } }[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode the chunk
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;
                  if (!delta) continue;

                  if (delta.content) {
                    stepText += delta.content;
                    finalText += delta.content;
                    await writer.write(encoder.encode(`data: ${JSON.stringify(delta.content)}\n\n`));
                  }

                  // Accumulate tool call deltas
                  if (delta.tool_calls) {
                    for (const tcDelta of delta.tool_calls) {
                      const idx = tcDelta.index ?? 0;
                      const incomingName = tcDelta.function?.name ?? "";
                      const incomingArgs = tcDelta.function?.arguments ?? "";
                      if (!stepToolCalls[idx]) {
                        console.log(`[stream] NEW tool slot [${idx}] name="${incomingName}"`);
                        stepToolCalls[idx] = {
                          id: tcDelta.id ?? `call_${Date.now()}_${idx}`,
                          type: "function",
                          function: { name: incomingName, arguments: "" },
                        };
                      } else {
                        if (tcDelta.id && !stepToolCalls[idx].id) stepToolCalls[idx].id = tcDelta.id;
                        if (incomingName) {
                          stepToolCalls[idx].function.name += incomingName;
                          console.log(`[stream] APPENDED name chunk for tool[${idx}]: "${incomingName}" -> "${stepToolCalls[idx].function.name}"`);
                        }
                      }
                      if (incomingArgs) stepToolCalls[idx].function.arguments += incomingArgs;
                    }
                  }
                } catch (e) {
                  // Ignore malformed lines
                }
              }
            }
          }

          console.log(`[stream] step=${step} done. text="${stepText.slice(0, 60)}", toolCalls=${stepToolCalls.length}`);

          // No tool calls → we're done
          if (!stepToolCalls.length) break;

          // Add assistant message with tool calls
          messages.push({
            role: "assistant",
            content: stepText || null,
            tool_calls: stepToolCalls,
          });

          // Execute tool calls
          for (const tc of stepToolCalls) {
            toolCallNames.push(tc.function.name);
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(tc.function.arguments ?? "{}"); } catch { /* ignore */ }

            console.log(`[stream] executing tool=${tc.function.name}, args=${JSON.stringify(args)}`);
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
            console.log(`[stream] tool=${tc.function.name} result=${JSON.stringify(result).slice(0, 120)}`);

            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }

          if (step === 4) break; // safety
        }
      } catch (e) {
        console.error("[stream] agentic loop error:", e);
      } finally {
        // Persist to session
        session.conversation_history.push({ role: "assistant", content: finalText });
        updateConversationLog(session_id, {
          timestamp: new Date().toISOString(),
          customer_message: message,
          ai_response: finalText,
          tool_calls: toolCallNames.map((name) => ({ tool: name, args: {} })),
        }).catch(console.error);

        // Emit final order state
        const order = toFrontendOrder(session_id);
        await writer.write(encoder.encode(`data: [ORDER]${JSON.stringify(order)}\n\n`));
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("[POST /api/agent/stream] error:", e);
    return new Response(`data: ${JSON.stringify({ error: String(e) })}\n\n`, {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }
}
