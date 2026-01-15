import { getRequestEvent } from "$app/server";
import type { RequestEvent } from "../../routes/$types";
import { env } from "$env/dynamic/private";

async function logIn(fetch: RequestEvent["fetch"]) {
    const authResponse = await fetch("https://analytics.zelo.dev/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username: env.UMAMI_API_CLIENT_USERNAME,
            password: env.UMAMI_API_CLIENT_PASSWORD
        })
    });
    return await authResponse.json();
}

export async function getOnlineUsers() {
    const { fetch } = getRequestEvent();

    try {
        const { token } = await logIn(fetch);

        const realtimeResponse = await fetch(
            "https://analytics.zelo.dev/api/realtime/634d53b7-0a46-4caf-82a8-95db35ba1f6d",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const { totals } = await realtimeResponse.json();
        return (totals.visitors as number) || 1;
    } catch (error) {
        console.error("Error fetching online users:", error);
        return 1;
    }
}
