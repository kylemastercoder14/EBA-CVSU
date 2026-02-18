import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CANDIDATE_KEY_PATHS = ["certs/private-key.pem", "certs/qz/private-key.pem"];

type SignBody = {
  request?: string;
};

const resolveKeyPath = () => {
  const configured = process.env.QZ_PRIVATE_KEY_PATH;
  if (configured) return path.resolve(process.cwd(), configured);
  return path.resolve(process.cwd(), CANDIDATE_KEY_PATHS[0]);
};

export async function POST(request: Request) {
  const rawText = await request.text();
  const parsed = parseSignBody(rawText);
  const toSign = parsed?.request;

  if (!toSign) {
    return NextResponse.json({ error: "Missing request payload to sign." }, { status: 400 });
  }

  const attempts = configuredPaths(resolveKeyPath(), CANDIDATE_KEY_PATHS);
  let privateKey: string | null = null;

  for (const keyPath of attempts) {
    try {
      privateKey = await readFile(keyPath, "utf8");
      break;
    } catch {
      // Try next candidate path.
    }
  }

  if (!privateKey) {
    return NextResponse.json(
      {
        error:
          "QZ private key not found. Set QZ_PRIVATE_KEY_PATH or place private-key.pem in /certs.",
      },
      { status: 500 },
    );
  }

  const signer = createSign("RSA-SHA512");
  signer.update(toSign);
  signer.end();
  const signature = signer.sign(privateKey, "base64");

  return NextResponse.json({ signature });
}

function parseSignBody(raw: string): SignBody | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SignBody;
  } catch {
    return null;
  }
}

function configuredPaths(primary: string, defaults: string[]) {
  const base = [primary, ...defaults.map((p) => path.resolve(process.cwd(), p))];
  return Array.from(new Set(base));
}
