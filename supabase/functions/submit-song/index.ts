// Kept dependency-free so the handler can also be exercised with Node's test runner.
interface Dependencies {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
}

const invalidLink = "Use a Spotify track link. Copy one from the song's Share menu.";

export const createHandler = ({ env, fetch: fetchRequest }: Dependencies) =>
  async (request: Request): Promise<Response> => {
    const origin = request.headers.get("origin") ?? "";
    const allowedOrigins = (env("SONGWALL_ALLOWED_ORIGINS") ?? "")
      .split(",").map((value) => value.trim()).filter(Boolean);
    const cors = {
      "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : "null",
      "Access-Control-Allow-Headers": "apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
      "Cache-Control": "no-store",
    };
    const reply = (status: number, body: unknown, extra: Record<string, string> = {}) =>
      Response.json(body, { status, headers: { ...cors, ...extra } });

    if (!allowedOrigins.length) {
      return reply(503, { error: "The wall isn't ready for submissions yet. Please try again later." });
    }
    if (!allowedOrigins.includes(origin)) {
      return reply(403, { error: "Please send your song from the portfolio." });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { error: "Use POST to submit a song." }, { Allow: "POST, OPTIONS" });
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return reply(415, { error: "Send your song as JSON." });
    }

    // Read a bounded stream rather than trusting the caller's Content-Length.
    let payload: Record<string, unknown>;
    try {
      const reader = request.body?.getReader();
      if (!reader) return reply(400, { error: "Add a Spotify track link first." });
      const decoder = new TextDecoder();
      let body = "";
      let bytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 4096) {
          await reader.cancel();
          return reply(413, { error: "That submission is too long." });
        }
        body += decoder.decode(value, { stream: true });
      }
      const parsed = JSON.parse(body + decoder.decode());
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      payload = parsed;
    } catch {
      return reply(400, { error: "Couldn't read that submission. Please try again." });
    }

    if (typeof payload.link !== "string") return reply(400, { error: invalidLink });
    let trackId: string;
    try {
      const url = new URL(payload.link.trim());
      const match = url.pathname.match(/^\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})\/?$/);
      if (url.protocol !== "https:" || url.hostname !== "open.spotify.com" || url.port || url.username || url.password || !match) throw new Error();
      trackId = match[1];
    } catch {
      return reply(400, { error: invalidLink });
    }

    if ((payload.who !== undefined && typeof payload.who !== "string") ||
        (payload.msg !== undefined && typeof payload.msg !== "string")) {
      return reply(400, { error: "Your name and note must be text." });
    }
    const who = (payload.who as string | undefined)?.trim() || "Anonymous";
    const msg = (payload.msg as string | undefined)?.trim() || "No explanation. Just trust me.";
    if (who.length > 28 || msg.length > 140) {
      return reply(400, { error: "Keep your name to 28 characters and your note to 140." });
    }

    try {
      const baseUrl = env("SUPABASE_URL");
      const secretKeys = JSON.parse(env("SUPABASE_SECRET_KEYS") || "{}");
      const secretKey = secretKeys.default || env("SUPABASE_SERVICE_ROLE_KEY");
      if (!baseUrl || !secretKey) throw new Error("Missing server configuration");
      const headers = {
        apikey: secretKey,
        ...(secretKey.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${secretKey}` }),
        "Content-Type": "application/json",
      };
      const reservation = await fetchRequest(`${baseUrl}/rest/v1/rpc/reserve_song_wall_submission`, {
        method: "POST", headers, body: "{}", signal: AbortSignal.timeout(8000),
      });
      if (!reservation.ok) throw new Error("Couldn't reserve a submission");
      const retryAfter = await reservation.json();
      if (!Number.isInteger(retryAfter) || retryAfter < 0) throw new Error("Invalid reservation response");
      if (retryAfter > 0) {
        return reply(429, { error: "The wall is getting a lot of requests. Please try again later." }, { "Retry-After": String(retryAfter) });
      }

      const link = `https://open.spotify.com/track/${trackId}`;
      const metadataResponse = await fetchRequest(`https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (metadataResponse.status === 404 || metadataResponse.status === 400) {
        return reply(400, { error: "Spotify couldn't find that track. Try another song." });
      }
      if (!metadataResponse.ok) return reply(502, { error: "Spotify isn't responding right now. Please try again in a bit." });
      const metadata = await metadataResponse.json();
      if (typeof metadata.title !== "string" || !metadata.title.trim()) throw new Error("Missing track title");
      const song = {
        track_id: trackId, link,
        title: metadata.title.trim().slice(0, 300),
        artist: typeof metadata.author_name === "string" ? metadata.author_name.trim().slice(0, 300) || "Spotify" : "Spotify",
        cover: typeof metadata.thumbnail_url === "string" ? metadata.thumbnail_url.slice(0, 2048) : "",
        who, msg,
      };
      const saved = await fetchRequest(`${baseUrl}/rest/v1/song_wall?select=id,link,cover,title,artist,who,msg`, {
        method: "POST", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify(song), signal: AbortSignal.timeout(8000),
      });
      if (!saved.ok) {
        const problem = await saved.json().catch(() => ({}));
        if (problem.code === "23505") return reply(409, { error: "That song is already on the wall. Pick another track." });
        throw new Error("Couldn't save the song");
      }
      const songs = await saved.json();
      if (!Array.isArray(songs) || !songs[0]?.id) throw new Error("Missing saved song");
      return reply(201, { song: songs[0] });
    } catch {
      // Never return database details, credentials, or request content to visitors.
      return reply(503, { error: "Couldn't pin your song right now. Please try again in a bit." });
    }
  };

// Node tests import the handler without starting a server; Supabase runs Deno.
const runtime = (globalThis as typeof globalThis & {
  Deno?: { env: { get: (name: string) => string | undefined }; serve: (handler: (request: Request) => Promise<Response>) => void };
}).Deno;
if (runtime) runtime.serve(createHandler({ env: (name) => runtime.env.get(name), fetch }));
