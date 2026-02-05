import Pocketbase from "pocketbase";
import { getOnlineUsers } from "$lib/server/analytics";
import type { SocketMessageData } from "$lib/types";
import { tempEditBuffer } from "$lib";

export async function load() {
    const visitors = await getOnlineUsers();
    const client = new Pocketbase("https://cdn.zelo.dev");
    const bc = client.collection<SocketMessageData>("bracketcounter");

    const { buffer } = await bc.getOne("c7qpatzs5iizr7n");
    return { visitors, buffer: tempEditBuffer(buffer) };
}
