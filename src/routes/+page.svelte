<script lang="ts">
    import type { SocketMessageData } from "$lib/types";
    import Pocketbase from "pocketbase";
    import BCLOGO from "$lib/assets/bc_green.svg?component";
    import BFDIE1Results from "$lib/assets/results/bfdie1.png";
    import BFDIE2Results from "$lib/assets/results/bfdie2.png";
    import BFDIE3Results from "$lib/assets/results/bfdie3.png";
    import BFDIE4Results from "$lib/assets/results/bfdie4.png";
    import { formatRelativeTimeLong } from "$lib";
    import { onMount } from "svelte";
    import type { PageData } from "./$types";
    import { flip } from "svelte/animate";
    import { cubicIn, cubicInOut, cubicOut } from "svelte/easing";
    import { Tween } from "svelte/motion";

    const Characters: Record<string, { default: string }> = import.meta.glob(
        "$lib/assets/characters/*.webp",
        {
            eager: true, // assuming we're using all the images right away
            query: "?url"
        }
    );

    const { data }: { data: PageData } = $props();
    let { visitors, buffer } = $derived(data);
    // $inspect(buffer);

    const client = new Pocketbase("https://cdn.zelo.dev");
    const bc = client.collection<SocketMessageData>("bracketcounter");

    const totalContestantVotes = new Map([
        ["David", 12987 + 12236 + 8762 + 7966],
        ["Sticker", 5326 + 9645 + 7053 + 6043],
        ["Needy", 11141 + 7106 + 6821 + 6744],
        ["Fern", 19073 + 10030 + 6767 + 7899],
        ["Jammy", 7555 + 4432 + 5191 + 4439],
        ["Rose", 6801 + 5459 + 3780 + 2751],
        ["Beach Ball", 14744 + 5615 + 3394 + 1682],
        ["Toothpaste", 1427 + 1765 + 1868 + 1055],
        ["Ruler", 3300 + 1747 + 1766 + 1822],
        ["Money", 7171 + 2417 + 1177 + 830],
        ["Hot Dog", 4247 + 1207 + 960 + 796],
        ["Sidewalky", 4630 + 2632 + 2521 + 3133]
    ]);

    // const barTweens = new Map<string, { from: number; to: number }>();

    // worst hack in the world ??
    let allEpisodes = $state(false);
    const barWidth: Record<any, { width: Tween<number>; votes: Tween<number> }> = {
        a: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["a"], { easing: cubicInOut, duration: 2000 })
        },
        b: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["b"], { easing: cubicInOut, duration: 2000 })
        },
        c: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["c"], { easing: cubicInOut, duration: 2000 })
        },
        d: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["d"], { easing: cubicInOut, duration: 2000 })
        },
        e: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["e"], { easing: cubicInOut, duration: 2000 })
        },
        f: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["f"], { easing: cubicInOut, duration: 2000 })
        },
        g: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["g"], { easing: cubicInOut, duration: 2000 })
        },
        h: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["h"], { easing: cubicInOut, duration: 2000 })
        },
        i: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["i"], { easing: cubicInOut, duration: 2000 })
        },
        j: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["j"], { easing: cubicInOut, duration: 2000 })
        },
        k: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["k"], { easing: cubicInOut, duration: 2000 })
        },
        l: {
            width: new Tween(0, { easing: cubicInOut, duration: 2000 }),
            votes: new Tween(buffer.votes["l"], { easing: cubicInOut, duration: 2000 })
        }
    };

    type Contestant = {
        id: string;
        name: string;
        color: string;
        votes: number;
        percentage: number;
    };

    // Derived state: sort contestants by vote count and calculate percentages
    let sortedContestants: Contestant[] = $derived(
        Object.entries(buffer.votes)
            .map(([id, votes]) => {
                const [name, color] = buffer.config.contestants[id] || ["Unknown", "#cccccc"];
                const percentage = buffer.total > 0 ? (votes / buffer.total) * 100 : 0;
                if (allEpisodes) {
                    const totalVotes = totalContestantVotes.get(name) || 0;
                    return {
                        id,
                        name,
                        color,
                        votes: totalVotes + votes,
                        percentage: buffer.total > 0 ? (totalVotes / buffer.total) * 100 : 0
                    };
                }
                return { id, name, color, votes, percentage };
            })
            .sort((a, b) => b.votes - a.votes)
    );

    let firstTime = true;
    $effect(() => {
        for (const contestant of sortedContestants) {
            if (firstTime) {
                barWidth[contestant.id].width.set(
                    (contestant.votes / sortedContestants[0].votes) * 100,
                    { duration: 0 }
                );
                // barWidth[contestant.id].votes.set(contestant.votes, { duration: 0 });
            } else {
                barWidth[contestant.id].width.set(
                    (contestant.votes / sortedContestants[0].votes) * 100
                );
                barWidth[contestant.id].votes.set(contestant.votes);
            }
        }
        firstTime = false;
    });

    let navHeight = $state(0);

    let currentDate = $state(new Date());
    const lastUpdated = $derived(
        formatRelativeTimeLong(new Date(buffer.status.updateDate), currentDate)
    );

    onMount(() => {
        const interval = setInterval(() => {
            currentDate = new Date();
        }, 1000);

        const subscription = bc.subscribe("c7qpatzs5iizr7n", async (e) => {
            ({ buffer } = e.record);
        });

        return () => {
            clearInterval(interval);
            subscription.then((s) => s());
        };
    });
</script>

{#snippet info()}
    <div>
        <section class="text-xl">
            <span>VOTING ENDS:</span>
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
    </div>
{/snippet}

{#snippet bar(contestant: Contestant)}
    {@const nameColor = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const color = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const image = Characters[`/src/lib/assets/characters/${contestant.name}.webp`].default}
    {@const votes = barWidth[contestant.id].votes.current}
    {@const width = barWidth[contestant.id].width.current}
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
                    <span class="id absolute -left-2 font-mono text-xs font-bold sm:top-3">
                        {contestant.id.toUpperCase()}
                    </span>
                    <span class="name mx-2 font-bold wrap-anywhere text-shadow-sm">
                        {contestant.name}
                    </span>
                </div>
                <div class="percentage ml-auto flex h-10 items-center max-lg:text-sm!">
                    <enhanced:img
                        src={image}
                        alt=""
                        class="relative h-10 scale-200 -rotate-15 self-end mask-r-from-40% mask-r-to-80% object-cover object-center"
                    />
                    {#if allEpisodes}
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
{/snippet}

<nav class="flex flex-col gap-2 text-black" bind:clientHeight={navHeight}>
    <section class="flex items-center justify-between gap-2 text-center max-sm:flex-col">
        <div class="text-xs">
            <div
                class="flex items-center justify-center gap-10 text-lg max-sm:flex-col max-sm:gap-1 max-sm:text-xs"
            >
                <div class="flex items-center gap-10">
                    <BCLOGO width="96" height="96" />
                    <div class="font-bold sm:hidden">
                        {@render info()}
                    </div>
                </div>
                <div>
                    <p>
                        This isn't official. Prior episode results (unconfirmed): <a
                            href={BFDIE1Results}>BFDIE1</a
                        >, <a href={BFDIE2Results}>BFDIE2</a>, <a href={BFDIE3Results}>BFDIE3</a>,
                        <a href={BFDIE4Results}>BFDIE4</a>
                    </p>
                    <p>
                        Based on <a href="https://bfb.figgyc.uk/static/gate.html"
                            >figgyc's bracketcounter</a
                        >.
                    </p>
                </div>
            </div>
        </div>
        <section class="justify-end text-xl font-bold max-sm:hidden">
            {@render info()}
        </section>
    </section>
    <div class="mb-5 flex items-center gap-2 max-sm:flex-col-reverse">
        <section class="w-50">
            <div class="flex overflow-hidden rounded ring-2 ring-lime-500">
                <button
                    class="toggle-btn"
                    class:active={!allEpisodes}
                    onclick={() => (allEpisodes = false)}
                >
                    BFDIE 5
                </button>
                <button
                    class="toggle-btn"
                    class:active={allEpisodes}
                    onclick={() => (allEpisodes = true)}
                >
                    ALL
                </button>
            </div>
        </section>
        <section>
            <div class="text-2xl font-bold">
                <p>Total Votes: {buffer.total.toLocaleString()}</p>
            </div>
            <div class="text-xs">
                <span class=""
                    >{visitors} {visitors === 1 ? "user" : "users"} watching on bc.zelo.dev</span
                >
                <!-- what a hack lmao -->
                <div class="mx-1 inline-block h-2 w-2 animate-ping rounded-full bg-green-500"></div>
                <div
                    class="relative right-4.75 mx-1 inline-block h-2 w-2 rounded-full bg-green-500"
                ></div>
                <span class="relative right-4.75">Updated {lastUpdated}</span>
            </div>
        </section>
    </div>
</nav>
<main class="mb-10 w-full grow" style="max-height: calc(100vh - {navHeight}px - 150px);">
    <div class="flex h-full flex-col items-stretch gap-1">
        {#each sortedContestants as contestant (contestant.id)}
            <div animate:flip={{ easing: cubicOut }}>
                {@render bar(contestant)}
            </div>
        {/each}
    </div>
</main>

<style>
    button {
        padding: 6px;
        margin-inline: 5px;
        background-color: var(--color-lime-900);
        border-radius: 5px;
    }

    .toggle-btn {
        flex: 1;
        padding: 8px 16px;
        margin: 0;
        background-color: var(--color-lime-900);
        border: none;
        border-radius: 0;
        color: var(--color-lime-500);
        font-weight: var(--font-weight-bold);
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover:not(.active) {
            background-color: var(--color-lime-800);
        }

        &.active {
            background-color: var(--color-lime-500);
            color: var(--color-lime-900);
        }
    }

    a {
        color: var(--color-cyan-500);
        font-weight: var(--font-weight-bold);

        &:hover {
            text-decoration: underline;
        }
    }

    /* .bar-container,
    .bar {
        corner-shape: squircle;
    } */

    .bar {
        container-type: inline-size;
        background-image: url("$lib/assets/dots_alpha.png");
        background-size: 32px;
        font-size: 2rem;
        /* transition: width 2s ease-in-out; */
    }

    .percentage {
        font-size: 2rem;
        line-height: 1;
    }

    @media (height < 60rem /* 640px */) {
        .bar-container {
            height: calc(var(--spacing) * 10) /* 2.5rem = 40px */;
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
                /* font-size: 0.5rem; */
                /* line-height: 0.8; */

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
    }
</style>
