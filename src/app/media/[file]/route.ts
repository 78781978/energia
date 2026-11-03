import { readStored } from "@/lib/storage";

/** Publiczne obrazy wgrane w panelu (banery, aktualności). */
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^([a-f0-9]{24})\.(jpg|png|webp)$/);
  if (!m) return new Response("Nie znaleziono", { status: 404 });
  try {
    const buf = await readStored(`media/${file}`);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[m[2]],
        "Content-Length": String(buf.length),
        // nazwa pliku jest losowa i niezmienna – można cache'ować długo
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Nie znaleziono", { status: 404 });
  }
}
