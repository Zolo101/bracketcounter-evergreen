// Exports from the lib folder.

import type { SocketMessageData } from "./types";

// Add utility functions here to import via `$lib` alias
export { formatRelativeTimeLong } from "./time";

// Temp fix so that the eliminated contestant bars appear in "All"
// since you cannot vote for eliminated contestants in bfdie 6
export function tempEditBuffer(buffer: SocketMessageData["buffer"]) {
    buffer.config.contestants = Object.assign(buffer.config.contestants, {
        f: ["Toothpaste", "#46d0ed"],
        g: ["Beach Ball", "#f05657"],
        h: ["David", "#d6ebec"],
        i: ["Hot Dog", "#a25a52"],
        j: ["Jammy", "#f9a63c"],
        k: ["Ruler", "#ebd9a2"],
        l: ["Rose", "#d62d3f"]
    });
    buffer.votes = Object.assign(buffer.votes, {
        f: -1,
        g: -1,
        h: -1,
        i: -1,
        j: -1,
        k: -1,
        l: -1
    });

    return buffer;
}
