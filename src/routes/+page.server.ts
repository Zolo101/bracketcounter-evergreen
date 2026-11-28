import Pocketbase from "pocketbase";
// import { getOnlineUsers } from "$lib/server/analytics";
import type { SocketMessageData } from "$lib/types";

export async function load() {
    const client = new Pocketbase("https://cdn.zelo.dev");
    const bc = client.collection<SocketMessageData>("bracketcounter");

    const { buffer } = await bc.getOne("7au82u6xmi9i72q");
    return { buffer };
}
