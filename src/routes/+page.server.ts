import Pocketbase from "pocketbase";
// import { getOnlineUsers } from "$lib/server/analytics";
import type { SocketMessageData } from "$lib/types";

export async function load() {
    const client = new Pocketbase("https://cdn.zelo.dev");
    const bc = client.collection<SocketMessageData>("bracketcounter");

    const { buffer } = await bc.getOne("3vblfor8xkof2i0");

    // Typo fix lol
    // buffer.config.contestants["a5"][0] = "Naily";

    return { buffer };
}
