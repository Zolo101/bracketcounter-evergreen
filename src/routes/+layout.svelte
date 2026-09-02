<script lang="ts">
    import "./layout.css";

    import { onMount } from "svelte";
    import favicon from "$lib/assets/favicon.png";
    import embedImage from "$lib/assets/embed.png";

    const VERSION_CHECK_INTERVAL = 60_000;

    onMount(() => {
        if (!import.meta.env.PROD) return;

        let stopped = false;
        let reloading = false;

        const checkForNewDeployment = async () => {
            if (stopped || reloading) return;

            try {
                const response = await fetch(`/version.json?t=${Date.now()}`, {
                    cache: "no-store",
                    headers: { Accept: "application/json" }
                });

                if (!response.ok) return;

                const deployment = (await response.json()) as { version?: unknown };
                if (
                    typeof deployment.version === "string" &&
                    deployment.version !== __BUILD_VERSION__
                ) {
                    reloading = true;
                    window.location.reload();
                }
            } catch {
                // A temporary network failure should not interrupt the app.
            }
        };

        const interval = window.setInterval(checkForNewDeployment, VERSION_CHECK_INTERVAL);
        const checkWhenVisible = () => {
            if (document.visibilityState === "visible") void checkForNewDeployment();
        };

        document.addEventListener("visibilitychange", checkWhenVisible);
        void checkForNewDeployment();

        return () => {
            stopped = true;
            window.clearInterval(interval);
            document.removeEventListener("visibilitychange", checkWhenVisible);
        };
    });

    let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>TPOT Vote Tracker - bracketcounter</title>
    <meta
        name="description"
        content="Live vote tracker for BFDI: The Power of Two (TPOT). See real-time elimination vote counts and rankings for rejoining contestants."
    />
    <meta
        name="keywords"
        content="TPOT, Battle for Dream Island, The Power Of Two, bracketcounter, vote tracker, BFDI, BFDIE, elimination votes"
    />
    <meta name="author" content="Zelo101" />
    <meta property="og:title" content="TPOT Vote Tracker - bracketcounter" />
    <meta
        property="og:description"
        content="Live vote tracker for BFDI: The Power of Two (TPOT). See real-time elimination vote counts and rankings for rejoining contestants."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://bc.zelo.dev" />
    <meta property="og:image" content={embedImage} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="TPOT Vote Tracker - bracketcounter" />
    <meta
        name="twitter:description"
        content="Live vote tracker for BFDI: The Power of Two (TPOT). See real-time elimination vote counts and rankings for rejoining contestants."
    />
    <meta name="twitter:image" content={embedImage} />
    <script
        defer
        src="https://analytics.zelo.dev/script.js"
        data-website-id="634d53b7-0a46-4caf-82a8-95db35ba1f6d"
    ></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,100..1000;1,100..1000&display=swap"
    />
</svelte:head>
<enhanced:img
    class="background"
    fetchpriority="high"
    src="$lib/assets/thanks.png?w=640;1280;1920;2560"
    sizes="100vw"
    alt=""
/>
<div class="background2"></div>
<div class="container2 m-auto flex h-full flex-col">{@render children()}</div>

<style>
    .background {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100dvh;
        object-fit: cover;
        object-position: center;
    }
    .background2 {
        position: fixed;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        /* background: linear-gradient(to bottom, #a6e0ec, black); */
        background: linear-gradient(to bottom, transparent, black 80%);
    }

    .container2 {
        position: relative;
        z-index: 1;
        width: 100%;
        @media (width >= 0rem /* 768px */) {
            padding: 0 1rem;
        }
        @media (width >= 64rem /* 1024px */) {
            max-width: 64rem /* 1024px */;
        }
        @media (width >= 80rem /* 1280px */) {
            max-width: 80rem /* 1280px */;
        }
        @media (width >= 96rem /* 1536px */) {
            max-width: 96rem /* 1536px */;
        }
    }
</style>
