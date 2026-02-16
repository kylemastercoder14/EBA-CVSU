import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const saveFileLocally = async (file: File): Promise<string> => {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create unique filename
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = file.name.split(".").pop();
  const filename = `product-${uniqueSuffix}.${ext}`;

  // Save to public/uploads/products directory
  const uploadDir = join(process.cwd(), "public", "uploads", "products");
  await mkdir(uploadDir, { recursive: true });

  const filepath = join(uploadDir, filename);
  await writeFile(filepath, buffer);

  // Return public URL
  return `/uploads/products/${filename}`;
};
