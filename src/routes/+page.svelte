<script lang="ts">
    import type { SocketMessageData } from "$lib/types";
    import Pocketbase from "pocketbase";
    import BCLOGO from "$lib/assets/bc_blurple.svg?component";
    import { formatRelativeTimeLong } from "$lib";
    import { onMount } from "svelte";
    import type { PageData } from "./$types";
    import { flip } from "svelte/animate";
    import { cubicIn, cubicInOut, cubicOut } from "svelte/easing";
    import { Tween } from "svelte/motion";
    import QR from "$lib/assets/qr.png";

    const Characters: Record<string, { default: string }> = import.meta.glob(
        "$lib/assets/icons/*.png",
        {
            eager: true, // assuming we're using all the images right away
            query: {
                enhanced: true,
                w: "96;288",
                effort: "max"
            }
        }
    );

    const Sounds: Record<string, { default: string }> = import.meta.glob(
        "$lib/assets/sounds/*.ogg",
        {
            eager: true,
            query: "?url"
        }
    );

    let currentAudio: HTMLAudioElement | undefined;
    let playingContestants = $state<Record<string, number>>({});

    function playContestantSound(name: string) {
        const sound = Sounds[`/src/lib/assets/sounds/${name}.ogg`]?.default;
        if (!sound) return;

        // currentAudio?.pause();
        const audio = new Audio(sound);
        currentAudio = audio;
        playingContestants[name] = (playingContestants[name] ?? 0) + 1;

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            playingContestants[name] = Math.max((playingContestants[name] ?? 1) - 1, 0);
        };

        audio.onended = finish;
        void audio.play().catch(finish);
    }

    const { data }: { data: PageData } = $props();
    let { buffer } = $derived(data);
    let visitors = $state<number | null>(null);
    // $inspect(buffer);

    const client = new Pocketbase("https://cdn.zelo.dev");
    const bc = client.collection<SocketMessageData>("bracketcounter");

    // const barTweens = new Map<string, { from: number; to: number }>();

    // worst hack in the world ??
    /** false = least, true = most */
    let sort = $state(false);
    let countsReady = $state(false);
    // const barWidth: Record<any, { width: Tween<number>; votes: Tween<number> }> = {
    const barWidth: Record<any, { votes: Tween<number> }> = {};

    // console.log(buffer.votes);
    for (const id of Object.keys(buffer.votes)) {
        if (!barWidth[id]) {
            barWidth[id] = {
                votes: new Tween(buffer.votes[id], { easing: cubicInOut, duration: 2000 })
            };
        }
    }

    type Contestant = {
        id: string; // vote letters
        name: string;
        color: string;
        votes: number;
        percentage: number;
    };

    // sort contestants by vote count and calculate percentages
    let sortedContestants: Contestant[] = $derived(
        Object.entries(buffer.votes)
            .map(([id, votes]) => {
                const [name, color] = buffer.config.contestants[id] || ["Unknown", "#cccccc"];
                const percentage = buffer.total > 0 ? (votes / buffer.total) * 100 : 0;
                if (sort) {
                    // const totalVotes = totalContestantVotes.get(name) || 0;
                    return {
                        id,
                        name,
                        color,
                        // votes: totalVotes + votes,
                        votes
                        // percentage: buffer.total > 0 ? (totalVotes / buffer.total) * 100 : 0
                    };
                }
                return { id, name, color, votes, percentage };
            })
            // .sort((a, b) => b.votes - a.votes)
            .sort((a, b) => a.votes - b.votes)
    );

    let navHeight = $state(0);

    let currentDate = $state(new Date());
    const lastUpdated = $derived(
        formatRelativeTimeLong(new Date(buffer.status.updateDate), currentDate)
    );

    onMount(() => {
        const interval = setInterval(() => {
            currentDate = new Date();
        }, 1000);

        let cancelled = false;
        let unsubscribe: (() => void) | undefined;
        let viewerCountRequest: AbortController | undefined;

        const updateViewerCount = async () => {
            if (document.visibilityState !== "visible" || viewerCountRequest) return;

            viewerCountRequest = new AbortController();

            try {
                const response = await fetch("/api/viewers", {
                    headers: { Accept: "application/json" },
                    signal: viewerCountRequest.signal
                });
                if (!response.ok) return;

                const data = (await response.json()) as { visitors?: unknown };
                if (typeof data.visitors === "number" && !cancelled) {
                    visitors = data.visitors;
                }
            } catch (error) {
                if (!(error instanceof DOMException && error.name === "AbortError")) {
                    console.error("Failed to fetch the viewer count", error);
                }
            } finally {
                viewerCountRequest = undefined;
            }
        };

        const updateBuffer = (nextBuffer: SocketMessageData["buffer"], animate = true) => {
            // Server has it as Needle but needle is C2, so this is a fix for that goofy typo
            nextBuffer.config.contestants["a5"][0] = "Naily";

            for (const [id, votes] of Object.entries(nextBuffer.votes)) {
                if (!animate || !barWidth[id]) {
                    barWidth[id] = {
                        votes: new Tween(votes, { easing: cubicInOut, duration: 2000 })
                    };
                } else {
                    barWidth[id].votes.set(votes);
                }
            }

            buffer = nextBuffer;
        };

        const initialiseCounts = async () => {
            try {
                const record = await bc.getOne("fq6gqvwz3mjqeza");
                if (!cancelled) {
                    updateBuffer(record.buffer, false);
                    countsReady = true;
                }
            } catch (error) {
                console.error("Failed to fetch the latest counts", error);
                countsReady = true;
            }

            if (cancelled) return;

            unsubscribe = await bc.subscribe("fq6gqvwz3mjqeza", (e) => {
                updateBuffer(e.record.buffer);
                countsReady = true;
            });

            if (cancelled) unsubscribe();
        };

        void initialiseCounts();
        void updateViewerCount();
        const viewerCountInterval = setInterval(() => void updateViewerCount(), 600_000);

        return () => {
            cancelled = true;
            clearInterval(interval);
            clearInterval(viewerCountInterval);
            viewerCountRequest?.abort();
            unsubscribe?.();
            currentAudio?.pause();
        };
    });
</script>

{#snippet info()}
    <div class="py-5">
        <section class="text-xl">
            <span
                >{new Date(buffer.status.deadline)
                    .toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric"
                    })
                    .toUpperCase()}</span
            >
        </section>
        <section class="max-sm:hidden">
            <span
                ><abbr title="Count from the beginning to catch any vote changes / deletions"
                    >RECOUNTS</abbr
                > EVERY</span
            >
            <span>{buffer.config.longRefreshTime / 3600} HOURS</span>
        </section>
        <section class="flex items-center gap-2 italic max-sm:hidden">
            <span class="font-normal">View the counts live on <strong>bc.zelo.dev</strong></span>
            <img src={QR} alt="QR Code for bc.zelo.dev" class="w-16 invert" />
        </section>
        <p class="text-xs"></p>
    </div>
{/snippet}

{#snippet bar(contestant: Contestant)}
    {@const nameColor = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const color = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const image = Characters[`/src/lib/assets/characters/${contestant.name}.webp`].default}
    {@const votes = barWidth[contestant.id].votes.current}
    {@const width = barWidth[contestant.id].width.current}
    {#if votes > 0}
        <div class="w-full grow items-center gap-5">
            <div
                class="bar-container flex h-15 items-center gap-5 overflow-hidden rounded-md drop-shadow-xl"
            >
                <div
                    class="bar flex h-full items-center rounded-md px-3 leading-4 drop-shadow-xs"
                    style="width: {width}%; background-color: {contestant.color};"
                >
                    <div
                        class="title relative flex items-baseline gap-2 self-center brightness-175 contrast-125"
                        style="color: {nameColor};"
                    >
                        {#if contestant.id && buffer.votes[contestant.id] > 0}
                            <span class="id absolute -left-2 font-mono text-xs font-bold sm:top-3">
                                {contestant.id.toUpperCase()}
                            </span>
                        {/if}
                        <span class="name mx-2 font-bold wrap-anywhere text-shadow-sm">
                            {contestant.name}
                        </span>
                    </div>
                    <div class="percentage ml-auto flex h-10 items-center">
                        <enhanced:img
                            src={image}
                            alt=""
                            class="relative h-10 scale-200 -rotate-15 self-end mask-r-from-40% mask-r-to-80% object-cover object-center"
                        />
                        {#if sort}
                            <span
                                class="flex font-bold tabular-nums brightness-150 text-shadow-sm max-sm:text-shadow-md sm:text-2xl"
                                style="color: {color};"
                            >
                                {votes.toFixed(0)}
                            </span>
                        {:else}
                            <span
                                class="flex font-bold tabular-nums brightness-150 text-shadow-sm max-sm:text-shadow-md sm:text-2xl"
                                style="color: {color};"
                            >
                                {votes.toFixed(0)} ({contestant.percentage.toFixed(1)}%)
                            </span>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
    {/if}
{/snippet}

{#snippet cell(contestant: Contestant)}
    {@const nameColor = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const color = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const image = Characters[`/src/lib/assets/icons/${contestant.name}.png`]?.default}
    {@const sound = Sounds[`/src/lib/assets/sounds/${contestant.name}.ogg`]?.default}
    {@const votes = barWidth[contestant.id].votes.current}
    <!-- {#if votes > 0} -->
    <div class="h-full w-full grow items-center gap-5">
        <div
            class="bar-container flex h-full w-full justify-center gap-5 overflow-hidden rounded-md drop-shadow-xl"
        >
            <div
                class="bar flex h-full flex-col justify-center rounded-md leading-4 drop-shadow-xs"
            >
                <!-- style="background-color: {contestant.color};" -->
                <button
                    type="button"
                    class={[
                        "m-auto enabled:cursor-pointer disabled:cursor-default",
                        playingContestants[contestant.name] > 0 && "animate-spin"
                    ]}
                    disabled={!sound}
                    onclick={() => playContestantSound(contestant.name)}
                >
                    {#if image}
                        <enhanced:img
                            src={image}
                            alt={contestant.name}
                            class="h-24 w-24"
                            // sizes="96px"
                        />
                    {/if}
                </button>
                <!-- <div
                    class="title relative flex items-baseline gap-2 self-center brightness-175 contrast-125"
                    style="color: {nameColor};"
                >
                    {#if contestant.id && buffer.votes[contestant.id] > 0}
                    {/if}
                    </div> -->
                <!-- <span class="id absolute font-mono text-xs font-bold sm:top-3"> </span> -->
                <div class="absolute right-5 bottom-6 max-lg:bottom-6">
                    <!-- <span class="name text-xs font-bold wrap-anywhere text-shadow-sm">
                        {contestant.name}
                    </span> -->
                    <span class="text-[9px] font-bold opacity-50">
                        {contestant.id.toUpperCase()}
                    </span>
                </div>

                <div class="percentage flex h-10 items-center justify-center max-lg:text-sm!">
                    <span
                        class="flex font-bold tabular-nums brightness-150 text-shadow-sm max-lg:text-4xl max-sm:text-shadow-md"
                    >
                        <!-- style="color: {color};" -->
                        {Math.floor(votes).toLocaleString()}
                        <!-- ({contestant.percentage.toFixed(1)}%) -->
                    </span>
                </div>
            </div>
        </div>
    </div>
    <!-- {/if} -->
{/snippet}

<nav class="bg- flex flex-col gap-2 text-white" bind:clientHeight={navHeight}>
    <section class="flex items-center justify-between gap-2 max-sm:flex-col">
        <div class="text-xs">
            <div
                class="flex items-center justify-center gap-10 text-lg max-sm:flex-col max-sm:gap-1 max-sm:text-sm"
            >
                <div class="flex items-center gap-10">
                    <BCLOGO width="96" height="96" />
                    <div class="font-bold sm:hidden">
                        {@render info()}
                    </div>
                </div>
                <div>
                    <p>
                        Unofficial vote counter for TPOT 25, based on <a
                            target="_blank"
                            href="https://bfb.figgyc.uk/static/gate.html">figgyc's bracketcounter</a
                        >. <a href="/past">BFDIE results</a>
                    </p>
                    <p>
                        The contestant with the <strong class="font-black">least</strong>
                        votes will rejoin.
                    </p>
                    <!-- (according to <em class="text-green-400">Two...</em>) -->
                    <p class="font-bold text-blue-100">
                        *We cannot count the <a
                            target="_blank"
                            href="https://forms.gle/m9VrLxqktU5KX7GW8">google form</a
                        > votes!!!
                    </p>
                </div>
            </div>
        </div>
        <section class="justify-end text-xl font-bold max-sm:hidden">
            {@render info()}
        </section>
    </section>
    <div class="mb-5 flex items-center gap-2 max-sm:flex-col-reverse">
        <!-- <section class="w-50">
            <div class="flex overflow-hidden rounded ring-2 ring-secondary">
                <button class="toggle-btn" class:active={!sort} onclick={() => (sort = false)}>
                    LEAST
                </button>
                <button class="toggle-btn" class:active={sort} onclick={() => (sort = true)}>
                    MOST
                </button>
            </div>
        </section> -->
        <section>
            <div class="text-2xl font-bold max-lg:text-4xl">
                <p>Total Votes: {countsReady ? `${buffer.total.toLocaleString()}*` : "Loading…"}</p>
            </div>
            <div class="text-xs">
                {#if visitors !== null}
                    <span>
                        {visitors.toLocaleString()}
                        {visitors === 1 ? "user" : "users"} watching on bc.zelo.dev
                    </span>
                    <br />
                {/if}
                {#if countsReady}
                    <div
                        class="mx-1 inline-block h-2 w-2 animate-ping rounded-full bg-green-500"
                    ></div>
                    <div
                        class="relative right-4.75 mx-1 inline-block h-2 w-2 rounded-full bg-green-500"
                    ></div>
                    <span class="relative right-4.75">Updated {lastUpdated}</span>
                {/if}
            </div>
        </section>
    </div>
</nav>
<!-- <main class="mb-10 w-full grow" style="max-height: calc(100vh - {navHeight}px - 150px);"> -->
<main class="mb-10 w-full grow">
    <div class={["shabang gap-1", !countsReady && "invisible"]}>
        {#each sortedContestants as contestant (contestant.id)}
            <!-- <div animate:flip={{ easing: cubicOut }}> -->
            <div>
                <!-- {@render bar(contestant)} -->
                {@render cell(contestant)}
            </div>
        {/each}
    </div>
</main>

<style>
    /* the whole shabang */
    .shabang {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
        flex-direction: column;
        gap: 1rem;
    }

    .toggle-btn {
        flex: 1;
        padding: 8px 16px;
        margin: 0;
        background-color: var(--color-primary);
        border: none;
        border-radius: 0;
        color: var(--color-secondary);
        font-weight: var(--font-weight-bold);
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover:not(.active) {
            background-color: var(--color-primary);
        }

        &.active {
            background-color: var(--color-secondary);
            color: var(--color-primary);
        }
    }

    /* .bar-container,
    .bar {
        corner-shape: squircle;
    } */

    .bar {
        width: 96px;
        height: 120px;
        container-type: inline-size;
        /* background-image: url("$lib/assets/dots_alpha.png"); */
        background-size: 32px;
        font-size: 2rem;
        /* transition: width 2s ease-in-out; */
    }

    .percentage {
        font-size: 2rem;
        line-height: 1;
    }

    /* @media (height < 60rem) {
        .bar-container {
            height: calc(var(--spacing) * 10);
        }
    }
    @container (width < 400px) {
        .bar {
            width: 100%;

            .name {
                font-size: 1.5rem;

                width: 100%;
            }

            img {
                display: none;
            }
        }

        .percentage {
            position: absolute;
            left: min(calc(100vw - 150px), calc(100% + 10px));

            span {
                width: 300px;
            }
        }
    }

    @container (width < 200px) {
        .bar {
            .name {
                font-size: 1.5rem;
            }
        }
    }

    @container (width < 100px) {
        .bar {
            position: relative;

            .name {
                font-size: 1rem;
            }

            .id {
                position: absolute;
                left: -15px;
            }

            .title {
                position: absolute;
                left: calc(100% + 0px);
                top: 6px;

                width: 110px;
            }

            .percentage {
                position: absolute;
                left: calc(100% + 8px);
                top: 9px;

                span {
                    font-size: var(--text-sm);
                    width: 110px;
                }
            }
        }
    } */
</style>
