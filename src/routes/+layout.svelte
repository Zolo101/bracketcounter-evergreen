<script lang="ts">
    import "./layout.css";

    import favicon from "$lib/assets/favicon.png";
    import embedImage from "$lib/assets/embed.png";
    let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <title>bracketcounter | TPOT Vote Tracker</title>
    <meta
        name="description"
        content="Live vote tracker for BFDI: The Power of Two (TPOT). See real-time elimination vote counts and rankings for rejoining contestants."
    />
    <meta
        name="keywords"
        content="TPOT, Battle for Dream Island, The Power Of Two, bracketcounter, vote tracker, BFDI, BFDIE, elimination votes"
    />
    <meta name="author" content="Zelo101" />
    <meta property="og:title" content="bracketcounter | TPOT Vote Tracker" />
    <meta
        property="og:description"
        content="Live vote tracker for BFDI: The Power of Two (TPOT). See real-time elimination vote counts and rankings for rejoining contestants."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://bc.zelo.dev" />
    <meta property="og:image" content={embedImage} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="bracketcounter | TPOT Vote Tracker" />
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
</svelte:head>
<div class="container2 m-auto flex h-full flex-col">{@render children()}</div>
<div class="background2"></div>

<!-- <enhanced:img class="background" src="$lib/assets/thanks.png" alt="" /> -->

<style>
    .background {
        position: fixed;
        bottom: 0;
        left: 0;
        z-index: -1;
    }

    .background2 {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -2;
        /* background-color: #a2deec; */
        /* background-color: #a6e0ec; */
        background-color: lightblue;
    }

    .container2 {
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
