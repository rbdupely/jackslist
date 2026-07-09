import { type NextRequest } from "next/server";
import { fetchPlacePhoto } from "@/lib/google";

// Proxies a Google Places photo so the API key stays server-side. next/image
// loads this same-origin. Cached hard since photo references are stable.
export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return new Response("missing ref", { status: 400 });
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return new Response("photos not configured", { status: 503 });
  }

  try {
    const upstream = await fetchPlacePhoto(ref, 800);
    if (!upstream.ok || !upstream.body) {
      return new Response("not found", { status: 404 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
      },
    });
  } catch (e) {
    console.error("place-photo", e);
    return new Response("error", { status: 500 });
  }
}
