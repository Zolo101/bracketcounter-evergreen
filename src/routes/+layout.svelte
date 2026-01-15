<script lang="ts">
    import "./layout.css";

    import favicon from "$lib/assets/favicon.png";
    import thanks from "$lib/assets/thanks1.png";
    let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /><title>bracketcounter</title></svelte:head>
<div class="container2 m-auto flex h-full flex-col">{@render children()}</div>
<div class="background2"></div>
<enhanced:img class="background" src={thanks} alt="Background image" />

<style>
    .background {
        position: absolute;
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
        background-color: #a6e0ec;
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
