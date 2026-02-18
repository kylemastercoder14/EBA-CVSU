import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const CANDIDATE_CERT_PATHS = [
  "certs/digital-certificate.txt",
  "certs/qz/digital-certificate.txt",
];

const resolveCertPath = () => {
  const configured = process.env.QZ_CERT_PATH;
  if (configured) return path.resolve(process.cwd(), configured);
  return path.resolve(process.cwd(), CANDIDATE_CERT_PATHS[0]);
};

export async function GET() {
  const attempts = configuredPaths(resolveCertPath(), CANDIDATE_CERT_PATHS);

  for (const certPath of attempts) {
    try {
      const cert = await readFile(certPath, "utf8");
      return new NextResponse(cert, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch {
      // Try next candidate path.
    }
  }

  return NextResponse.json(
    {
      error:
        "QZ certificate file not found. Set QZ_CERT_PATH or place digital-certificate.txt in /certs.",
    },
    { status: 500 },
  );
}

function configuredPaths(primary: string, defaults: string[]) {
  const base = [primary, ...defaults.map((p) => path.resolve(process.cwd(), p))];
  return Array.from(new Set(base));
}
