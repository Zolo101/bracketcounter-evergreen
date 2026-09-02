import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { enhancedImages } from "@sveltejs/enhanced-img";
import { defineConfig, type Plugin } from "vite";
import svg from "@poppanator/sveltekit-svg";

const buildVersion = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const deploymentVersion = (): Plugin => ({
    name: "deployment-version",
    apply: "build",
    generateBundle() {
        this.emitFile({
            type: "asset",
            fileName: "version.json",
            source: JSON.stringify({ version: buildVersion })
        });
    }
});

export default defineConfig({
    define: {
        __BUILD_VERSION__: JSON.stringify(buildVersion)
    },
    plugins: [
        tailwindcss(),
        enhancedImages(),
        sveltekit(),
        svg({ svgoOptions: { plugins: [{ name: "prefixIds" }] } }),
        deploymentVersion()
    ]
});
