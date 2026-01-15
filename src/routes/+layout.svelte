<script lang="ts">
    import "./layout.css";

    import favicon from "$lib/assets/favicon.png";
    let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /><title>bracketcounter</title></svelte:head>
<div class="container2 m-auto flex h-full flex-col">{@render children()}</div>
<div class="background"></div>

<style>
    .background {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
        background-color: #a2deec;
        background-image: url("$lib/assets/thanks1.png");
        background-size: contain;
        background-attachment: fixed;
        background-position: bottom;
        /* background-position-x: 0px; */
        /* background-repeat: repeat; */
        /* mirror repeat */
        background-repeat: repeat-x;
        /* filter: brightness(0.8) saturate(1.3); */
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
