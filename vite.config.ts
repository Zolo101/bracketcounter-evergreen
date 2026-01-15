import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { defineConfig } from "vite";
import svg from "@poppanator/sveltekit-svg";

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit(),
        enhancedImages(),
        svg({ svgoOptions: { plugins: [{ name: "prefixIds" }] } })
    ]
});
