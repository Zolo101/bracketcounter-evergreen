import { getOnlineUsers } from "$lib/server/analytics";

export async function load() {
    const visitors = await getOnlineUsers();
    return { visitors };
}
