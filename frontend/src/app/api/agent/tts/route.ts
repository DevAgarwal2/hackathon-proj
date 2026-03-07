// TTS route: converts text to speech via SarvamAI SDK (batch, returns base64)
// POST /api/agent/tts
// Body: { text, language?, speaker? }
// Response: { success: true, audio_base64: string }

import { NextRequest } from "next/server";
import { SarvamAIClient } from "sarvamai";
import type { SarvamAI } from "sarvamai";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      language = "hi-IN",
      speaker = "shubh",
    } = body as {
      text: string;
      language?: string;
      speaker?: string;
    };

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing SARVAM_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });

    const result = await client.textToSpeech.convert({
      text,
      target_language_code: language as SarvamAI.TextToSpeechLanguage,
      speaker: speaker as SarvamAI.TextToSpeechSpeaker,
      model: "bulbul:v3",
      pace: 1.1,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
    });

    const audio_base64 = result.audios?.[0] ?? "";

    return new Response(JSON.stringify({ success: true, audio_base64 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[TTS] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
