<script lang="ts">
    import type { SocketMessageData } from "$lib/types";
    import Pocketbase from "pocketbase";
    import BCLOGO from "$lib/assets/bc_green.svg?component";
    import BFDIE1Results from "$lib/assets/bfdie1.png";
    import { formatRelativeTimeLong } from "$lib";
    import { onMount } from "svelte";

    export const Characters: Record<string, { default: string }> = import.meta.glob(
        "$lib/assets/characters/*.webp",
        {
            eager: true, // assuming we're using all the images right away
            query: "?url"
        }
    );

    console.log(Characters);

    const client = new Pocketbase("https://cdn.zelo.dev");
    const bc = client.collection<SocketMessageData>("bracketcounter");

    async function getData() {
        return (await bc.getOne("c7qpatzs5iizr7n")).buffer;
    }

    let buffer = $state(await getData());
    $inspect(buffer);

    // Derived state: sort contestants by vote count and calculate percentages
    let sortedContestants = $derived(
        Object.entries(buffer.votes)
            .map(([id, votes]) => {
                const [name, color] = buffer.config.contestants[id] || ["Unknown", "#cccccc"];
                const percentage = buffer.total > 0 ? (votes / buffer.total) * 100 : 0;
                return { id, name, color, votes, percentage };
            })
            .sort((a, b) => b.votes - a.votes)
    );

    bc.subscribe("c7qpatzs5iizr7n", async (e) => {
        ({ buffer } = e.record);
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

        return () => {
            clearInterval(interval);
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

<nav class="flex flex-col text-black" bind:clientHeight={navHeight}>
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
                        Uses figgyc's <a href="https://github.com/figgyc/bracketcounter"
                            >bracket counter</a
                        > to count all votes in an episode.
                    </p>
                    <p>
                        This isn't official. Prior episode results (unconfirmed): <a
                            href={BFDIE1Results}>BFDIE1</a
                        >
                    </p>
                </div>
            </div>
        </div>
        <!-- <h1 class="text-3xl font-bold text-white sm:text-4xl">Bracketcounter</h1>
    <button>Bar Graph</button>
    <button disabled>Pie Chart</button>
    <button disabled>Timeline</button> -->
        <section class="justify-end text-xl font-bold max-sm:hidden">
            {@render info()}
        </section>
    </section>
    <!-- <hr /> -->
    <section class="mb-5">
        <div class="text-2xl font-bold">
            Total Votes: {buffer.total.toLocaleString()}
        </div>
        <div class="text-xs">
            Updated {lastUpdated}
        </div>
    </section>
</nav>
<main class="mb-10 w-full grow" style="max-height: calc(100vh - {navHeight}px - 150px);">
    <div class="flex h-full flex-col items-stretch gap-1">
        {#each sortedContestants as contestant (contestant.id)}
            {@const nameColor =
                // "color-mix(in oklch shorter hue, " + contestant.color + " 100%, white)"}
                "color-mix(in oklab, " + contestant.color + " 100%, white)"}
            {@const color = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
            {@const bracketColor = "color-mix(in oklab, " + contestant.color + " 80%, black)"}
            <!-- {@const nameColor = "color-mix(in oklab, " + contestant.color + " 70%, black)"} -->
            {@const image =
                Characters[`/src/lib/assets/characters/${contestant.name}.webp`].default}
            {@const width = (contestant.votes / sortedContestants[0].votes) * 100}
            <!-- <div class="grid w-full grow grid-cols-[auto_1fr] items-center gap-5"> -->
            <div class="w-full grow items-center gap-5">
                <!-- <p class="font-mono text-2xl font-bold text-black">
                    [{contestant.id.toUpperCase()}]
                </p> -->
                <div class="flex h-10 items-center gap-5 overflow-hidden rounded drop-shadow-xl">
                    <div
                        class="bar flex h-full items-center rounded px-3 leading-4 drop-shadow-xs"
                        style="width: {width}%; background-color: {contestant.color};"
                    >
                        <div
                            class="title relative flex items-baseline gap-2 self-center brightness-175 contrast-125"
                            style="color: {nameColor};"
                        >
                            <span class="id absolute -left-2 font-mono text-xs font-bold sm:top-3">
                                {contestant.id.toUpperCase()}
                            </span>
                            <!-- class="name mx-2 inline-block bg-linear-to-t from-black/50 to-transparent bg-clip-text font-bold wrap-anywhere text-transparent" -->
                            <span class="name mx-2 font-bold wrap-anywhere text-shadow-sm">
                                {contestant.name}
                            </span>
                        </div>
                        <div class="percentage ml-auto flex h-10 items-center max-lg:text-sm!">
                            <img
                                src={image}
                                alt=""
                                class="relative h-10 scale-200 -rotate-15 self-end mask-r-from-40% mask-r-to-80% object-cover object-center"
                            />
                            <span
                                class="flex font-bold tabular-nums brightness-150 text-shadow-sm max-sm:text-shadow-md sm:text-2xl"
                                style="color: {color};"
                            >
                                {contestant.votes.toLocaleString()} ({contestant.percentage.toFixed(
                                    1
                                )}%)
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        {/each}
    </div>
</main>

<!-- <footer class="py-6 text-center text-gray-400"></footer> -->

<style>
    button {
        padding: 6px;
        margin-inline: 5px;
        background-color: var(--color-lime-900);
        border-radius: 5px;
    }

    a {
        color: var(--color-cyan-500);
        font-weight: var(--font-weight-bold);

        &:hover {
            text-decoration: underline;
        }
    }

    hr {
        border-color: var(--color-green-500);
        margin: 1rem 0;
    }

    .bar {
        container-type: inline-size;
        background-image: url("$lib/assets/dots_alpha.png");
        background-size: 32px;
        font-size: 2rem;
    }

    .percentage {
        font-size: 2rem;
        line-height: 1;
    }

    svg {
        text {
            font: bold 5px sans-serif;
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
            left: min(50vw, calc(100% + 10px));

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
