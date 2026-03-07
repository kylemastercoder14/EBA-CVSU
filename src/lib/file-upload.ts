import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const toDataUrl = async (file: File): Promise<string> => {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const mimeType =
    typeof file.type === "string" && file.type.length > 0
      ? file.type
      : "application/octet-stream";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
};

export const isLocalProductUploadPath = (url: string | null | undefined): boolean =>
  typeof url === "string" && url.startsWith("/uploads/products/");

export const saveFileLocally = async (file: File): Promise<string> => {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create unique filename
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = file.name.split(".").pop();
  const filename = `product-${uniqueSuffix}.${ext}`;

  // Save to public/uploads/products directory
  const uploadDir = join(process.cwd(), "public", "uploads", "products");
  try {
    await mkdir(uploadDir, { recursive: true });

    const filepath = join(uploadDir, filename);
    await writeFile(filepath, buffer);
  } catch (error) {
    // Serverless production file systems are read-only (e.g. /var/task on Vercel).
    // Fall back to storing image content directly.
    if ((error as NodeJS.ErrnoException).code === "EROFS") {
      return toDataUrl(file);
    }
    throw error;
  }

  // Return public URL
  return `/uploads/products/${filename}`;
};
