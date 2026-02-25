import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VoiceInterpretCatalogProduct = {
  name?: string;
  category?: string;
  sizes?: string[];
};

type VoiceInterpretBody = {
  transcript?: string;
  products?: VoiceInterpretCatalogProduct[];
};

const DEFAULT_MODEL = "gpt-4o-mini";

const sanitizeCatalog = (products: VoiceInterpretCatalogProduct[] = []) => {
  return products
    .map((product) => ({
      name: product.name?.trim() ?? "",
      category: product.category?.trim() ?? "",
      sizes: Array.isArray(product.sizes)
        ? product.sizes
            .map((size) => String(size).trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
    }))
    .filter((product) => product.name)
    .slice(0, 200);
};

const extractJsonObject = (text: string) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
};

export async function POST(request: Request) {
  let body: VoiceInterpretBody | null = null;
  try {
    body = (await request.json()) as VoiceInterpretBody;
  } catch {
    body = null;
  }

  const transcript = body?.transcript?.trim() ?? "";
  const catalog = sanitizeCatalog(body?.products);

  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript is required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model =
    process.env.OPENAI_VOICE_INTERPRET_MODEL?.trim() || DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json({
      normalizedTranscript: transcript,
      usedAi: false,
      provider: "local",
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7_000);

  try {
    const systemPrompt = [
      "You normalize noisy speech-to-text transcripts for a kiosk ordering system.",
      "Return ONLY a JSON object with this shape: {\"normalizedTranscript\": string}.",
      "Rules:",
      "- Keep the user's intended item quantities, product names, and sizes.",
      "- Fix common ASR mistakes (e.g. 'to'/'too' -> 'two' when quantity, 'to xl' -> '2xl', 'slack' -> 'slacks').",
      "- Preserve item order.",
      "- Insert commas between separate items when helpful.",
      "- Use product names and sizes from the provided catalog when possible.",
      "- Do not invent products not in the catalog.",
      "- Keep the output concise as an order command, not a sentence explanation.",
    ].join("\n");

    const userPrompt = JSON.stringify(
      {
        transcript,
        catalog,
        targetStyle:
          "Example style: 2 test booklet, 1 id lace, 2 college polo size 2xl",
      },
      null,
      2,
    );

    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();
      return NextResponse.json(
        {
          normalizedTranscript: transcript,
          usedAi: false,
          provider: "openai",
          error: "OpenAI voice interpret request failed.",
          status: upstream.status,
          details: errorText.slice(0, 500),
        },
        { status: 200 },
      );
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";
    const jsonString = extractJsonObject(rawContent) ?? rawContent;

    let normalizedTranscript = transcript;
    try {
      const parsed = JSON.parse(jsonString) as { normalizedTranscript?: unknown };
      if (
        typeof parsed.normalizedTranscript === "string" &&
        parsed.normalizedTranscript.trim()
      ) {
        normalizedTranscript = parsed.normalizedTranscript.trim();
      }
    } catch {
      // Fall back to original transcript when JSON parse fails.
    }

    return NextResponse.json({
      normalizedTranscript,
      usedAi: true,
      provider: "openai",
      model,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown AI interpret error.";
    return NextResponse.json(
      {
        normalizedTranscript: transcript,
        usedAi: false,
        provider: "openai",
        error: message,
      },
      { status: 200 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
