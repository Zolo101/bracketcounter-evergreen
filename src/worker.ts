const VIEWER_COUNT_KEY = "active-viewers";

type ViewerCount = {
    visitors: number;
    updatedAt: string;
};

interface ViewerCountStore {
    get(key: string, type: "json"): Promise<ViewerCount | null>;
    put(key: string, value: string): Promise<void>;
}

interface Env {
    ASSETS: {
        fetch(request: Request): Promise<Response>;
    };
    VIEWER_COUNTS: ViewerCountStore;
    UMAMI_API_BASE_URL: string;
    UMAMI_WEBSITE_ID: string;
    UMAMI_USERNAME: string;
    UMAMI_PASSWORD: string;
}

interface WorkerContext {
    waitUntil(promise: Promise<unknown>): void;
}

function json(data: unknown, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");

    return new Response(JSON.stringify(data), { ...init, headers });
}

async function refreshViewerCount(env: Env) {
    const apiBaseUrl = env.UMAMI_API_BASE_URL.replace(/\/$/, "");
    const authResponse = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: env.UMAMI_USERNAME,
            password: env.UMAMI_PASSWORD
        })
    });

    if (!authResponse.ok) {
        throw new Error(`Umami authentication failed with status ${authResponse.status}`);
    }

    const auth = (await authResponse.json()) as { token?: unknown };
    if (typeof auth.token !== "string") {
        throw new Error("Umami authentication response did not include a token");
    }

    const activeResponse = await fetch(
        `${apiBaseUrl}/api/websites/${env.UMAMI_WEBSITE_ID}/active`,
        {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${auth.token}`
            }
        }
    );

    if (!activeResponse.ok) {
        throw new Error(`Umami active-user request failed with status ${activeResponse.status}`);
    }

    const active = (await activeResponse.json()) as { visitors?: unknown };
    if (
        typeof active.visitors !== "number" ||
        !Number.isFinite(active.visitors) ||
        active.visitors < 0
    ) {
        throw new Error("Umami returned an invalid active-user count");
    }

    const viewerCount: ViewerCount = {
        visitors: Math.floor(active.visitors),
        updatedAt: new Date().toISOString()
    };

    await env.VIEWER_COUNTS.put(VIEWER_COUNT_KEY, JSON.stringify(viewerCount));
}

async function getViewerCount(env: Env) {
    const viewerCount = await env.VIEWER_COUNTS.get(VIEWER_COUNT_KEY, "json");

    if (!viewerCount) {
        return json(
            { visitors: null, updatedAt: null },
            {
                status: 503,
                headers: {
                    "Cache-Control": "no-store",
                    "Retry-After": "60"
                }
            }
        );
    }

    return json(viewerCount, {
        headers: {
            "Cache-Control": "public, max-age=60"
        }
    });
}

export default {
    async fetch(request: Request, env: Env) {
        const url = new URL(request.url);

        if (url.pathname === "/api/viewers") {
            if (request.method !== "GET") {
                return new Response("Method Not Allowed", {
                    status: 405,
                    headers: { Allow: "GET" }
                });
            }

            return getViewerCount(env);
        }

        if (url.pathname.startsWith("/api/")) {
            return json({ error: "Not found" }, { status: 404 });
        }

        return env.ASSETS.fetch(request);
    },

    scheduled(_controller: unknown, env: Env, context: WorkerContext) {
        context.waitUntil(
            refreshViewerCount(env).catch((error) => {
                console.error("Failed to refresh the Umami viewer count", error);
            })
        );
    }
};
