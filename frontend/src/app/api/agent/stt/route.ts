// STT route: receives base64 audio, transcribes via sarvamai JS SDK (saaras:v3)
// POST /api/agent/stt
// Body: { audio_base64, session_id, restaurant_id, language? }
// Response: { success, transcript }

import { NextRequest, NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

function getClient() {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("Missing SARVAM_API_KEY env var");
  return new SarvamAIClient({ apiSubscriptionKey: apiKey });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      audio_base64,
      language = "hi-IN",
    } = body as {
      audio_base64: string;
      session_id: string;
      restaurant_id: string;
      language?: string;
    };

    if (!audio_base64) {
      return NextResponse.json(
        { success: false, error: "Missing audio_base64" },
        { status: 400 }
      );
    }

    // Decode base64 → Uint8Array (accepted as Uploadable by the SDK)
    const binaryStr = atob(audio_base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const client = getClient();
    const result = await client.speechToText.transcribe({
      file: { data: bytes, filename: "audio.webm", contentType: "audio/webm" },
      model: "saaras:v3",
      mode: "transcribe",
      language_code: (language === "auto" ? "unknown" : language) as "hi-IN" | "en-IN" | "unknown",
    });

    const transcript = result.transcript ?? "";
    // Sarvam returns detected language when using "unknown" / auto-detect
    const detectedLanguage = (result as any).language_code || language || "hi-IN";
    console.log(`[STT] transcript: "${transcript.slice(0, 80)}" | lang: ${detectedLanguage}`);

    return NextResponse.json({ success: true, transcript, language: detectedLanguage });
  } catch (e) {
    console.error("[STT] error:", e);
    return NextResponse.json(
      { success: false, error: String(e), transcript: "" },
      { status: 500 }
    );
  }
}
