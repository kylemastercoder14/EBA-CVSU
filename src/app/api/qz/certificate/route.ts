import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CANDIDATE_CERT_PATHS = [
  "certs/digital-certificate.txt",
  "certs/qz/digital-certificate.txt",
];

export async function GET() {
  // ✅ Priority 1: Use environment variable (works on Vercel)
  const envCert = process.env.QZ_CERTIFICATE;
  if (envCert) {
    // Restore newlines if stored as single line (Vercel sometimes strips them)
    const normalized = envCert.includes("-----")
      ? envCert.replace(/\\n/g, "\n")
      : `-----BEGIN CERTIFICATE-----\n${envCert.replace(/\\n/g, "\n")}\n-----END CERTIFICATE-----`;

    return new NextResponse(normalized, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // ✅ Priority 2: Read from file (works locally)
  const paths = [
    process.env.QZ_CERT_PATH
      ? path.resolve(process.cwd(), process.env.QZ_CERT_PATH)
      : null,
    ...CANDIDATE_CERT_PATHS.map((p) => path.resolve(process.cwd(), p)),
  ].filter(Boolean) as string[];

  for (const certPath of paths) {
    try {
      const cert = await readFile(certPath, "utf8");
      return new NextResponse(cert, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch {
      // Try next path
    }
  }

  return NextResponse.json(
    {
      error:
        "QZ certificate not found. Set QZ_CERTIFICATE env var or place digital-certificate.txt in /certs.",
    },
    { status: 500 },
  );
}
