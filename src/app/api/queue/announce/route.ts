import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AnnounceBody = {
  text?: string;
};

const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";

const getCandidateOutputFormats = (preferred: string) => {
  return Array.from(
    new Set([preferred, "mp3_44100_128", "mp3_44100_64", "mp3_44100_32"]),
  );
};

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  const outputFormat =
    process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || DEFAULT_OUTPUT_FORMAT;

  if (!apiKey || !voiceId) {
    return NextResponse.json(
      {
        error:
          "ElevenLabs is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID.",
      },
      { status: 503 },
    );
  }

  let body: AnnounceBody | null = null;
  try {
    body = (await request.json()) as AnnounceBody;
  } catch {
    body = null;
  }

  const text = body?.text?.trim();
  if (!text) {
    return NextResponse.json(
      { error: "Announcement text is required." },
      { status: 400 },
    );
  }

  try {
    const candidateFormats = getCandidateOutputFormats(outputFormat);
    const elevenlabs = new ElevenLabsClient({ apiKey });

    let lastError:
      | {
          format: string;
          status: number | null;
          details: string;
        }
      | null = null;

    for (const format of candidateFormats) {
      try {
        const upstream = await elevenlabs.textToSpeech
          .convert(voiceId, {
            text,
            modelId,
            outputFormat: format as
              | "mp3_44100_128"
              | "mp3_44100_64"
              | "mp3_44100_32",
          })
          .withRawResponse();

        const contentType =
          upstream.rawResponse.headers.get("content-type") ?? "audio/mpeg";

        return new Response(upstream.data, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "no-store",
            "X-Queue-TTS-Provider": "elevenlabs",
            "X-Queue-TTS-Format": format,
          },
        });
      } catch (error) {
        const asRecord = error as {
          statusCode?: number;
          body?: unknown;
          message?: string;
        };

        lastError = {
          format,
          status: asRecord.statusCode ?? null,
          details: (() => {
            if (typeof asRecord.body === "string") return asRecord.body;
            if (asRecord.body) {
              try {
                return JSON.stringify(asRecord.body);
              } catch {
                // ignore stringify failure
              }
            }
            return asRecord.message ?? "Unknown ElevenLabs SDK error.";
          })().slice(0, 800),
        };

        if (lastError.status && [401, 403, 404, 429].includes(lastError.status)) {
          break;
        }
      }
    }

    return NextResponse.json(
      {
        error: "ElevenLabs text-to-speech request failed.",
        status: lastError?.status ?? 502,
        attemptedFormats: getCandidateOutputFormats(outputFormat),
        failedFormat: lastError?.format ?? outputFormat,
        details: lastError?.details ?? "Unknown upstream error.",
      },
      { status: 502 },
    );
  } catch (error) {
    console.error("[Queue Announce] ElevenLabs request failed:", error);
    return NextResponse.json(
      { error: "Unable to generate queue announcement audio right now." },
      { status: 500 },
    );
  }
}
