<script lang="ts">
    import type { PageProps } from "./$types";

    import BFDIE1Results from "$lib/assets/results/bfdie1.png";
    import BFDIE2Results from "$lib/assets/results/bfdie2.png";
    import BFDIE3Results from "$lib/assets/results/bfdie3.png";
    import BFDIE4Results from "$lib/assets/results/bfdie4.png";
    import BFDIE5Results from "$lib/assets/results/bfdie5.png";
    import BFDIE6Results from "$lib/assets/results/bfdie6.png";
    import BFDIE7Results from "$lib/assets/results/bfdie7.png";
    import BFDIE8Results from "$lib/assets/results/bfdie8.png";
    import BFDIE9Results from "$lib/assets/results/bfdie9.png";
    import BFDIETotalResults from "$lib/assets/results/bfdie_total.png";

    let { data }: PageProps = $props();
</script>

<main class="flex flex-col gap-2 text-2xl text-black">
    <a href="/">GO BACK</a>

    <p>all of these are unofficial, unconfirmed past results</p>
    <h1 class="text-3xl font-bold">BFDIE</h1>
    <p>
        <a href={BFDIE1Results}>BFDIE1</a>, <a href={BFDIE2Results}>BFDIE2</a>,
        <a href={BFDIE3Results}>BFDIE3</a>,
        <a href={BFDIE4Results}>BFDIE4</a>, <a href={BFDIE5Results}>BFDIE5</a>,
        <a href={BFDIE6Results}>BFDIE6</a>, <a href={BFDIE7Results}>BFDIE7</a>,
        <a href={BFDIE8Results}>BFDIE8</a>, <a href={BFDIE9Results}>BFDIE9</a>,
        <a href={BFDIETotalResults}>TOTAL</a>
    </p>
</main>
