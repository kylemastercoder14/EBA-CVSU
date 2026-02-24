import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CANDIDATE_KEY_PATHS = [
  "certs/private-key.pem",
  "certs/qz/private-key.pem",
];

type SignBody = {
  request?: string;
};

export async function POST(request: Request) {
  const rawText = await request.text();
  const parsed = parseSignBody(rawText);
  const toSign = parsed?.request;

  if (!toSign) {
    return NextResponse.json(
      { error: "Missing request payload to sign." },
      { status: 400 },
    );
  }

  // ✅ Priority 1: Use environment variable (works on Vercel)
  const envKey = process.env.QZ_PRIVATE_KEY;
  if (envKey) {
    try {
      // Restore newlines if Vercel flattened them
      const normalized = envKey.includes("-----")
        ? envKey.replace(/\\n/g, "\n")
        : `-----BEGIN PRIVATE KEY-----\n${envKey.replace(/\\n/g, "\n")}\n-----END PRIVATE KEY-----`;

      const signer = createSign("RSA-SHA512");
      signer.update(toSign);
      signer.end();
      const signature = signer.sign(normalized, "base64");
      return NextResponse.json({ signature });
    } catch (err) {
      console.error("[QZ Sign] Failed to sign with env key:", err);
      // Fall through to file-based approach
    }
  }

  // ✅ Priority 2: Read from file (works locally)
  const paths = [
    process.env.QZ_PRIVATE_KEY_PATH
      ? path.resolve(process.cwd(), process.env.QZ_PRIVATE_KEY_PATH)
      : null,
    ...CANDIDATE_KEY_PATHS.map((p) => path.resolve(process.cwd(), p)),
  ].filter(Boolean) as string[];

  let privateKey: string | null = null;
  for (const keyPath of paths) {
    try {
      privateKey = await readFile(keyPath, "utf8");
      break;
    } catch {
      // Try next path
    }
  }

  if (!privateKey) {
    return NextResponse.json(
      {
        error:
          "QZ private key not found. Set QZ_PRIVATE_KEY env var or place private-key.pem in /certs.",
      },
      { status: 500 },
    );
  }

  try {
    const signer = createSign("RSA-SHA512");
    signer.update(toSign);
    signer.end();
    const signature = signer.sign(privateKey, "base64");
    return NextResponse.json({ signature });
  } catch (err) {
    console.error("[QZ Sign] Signing error:", err);
    return NextResponse.json({ error: "Signing failed." }, { status: 500 });
  }
}

function parseSignBody(raw: string): SignBody | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignBody;
  } catch {
    return null;
  }
}
