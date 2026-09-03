<script lang="ts">
    import type { SocketMessageData } from "$lib/types";
    import Pocketbase from "pocketbase";
    import BCLOGO from "$lib/assets/bracketcounter.svg?component";
    import BCLOGO_LONG from "$lib/assets/bracketcounter_long.svg?component";
    import { formatRelativeTimeLong } from "$lib";
    import { onMount } from "svelte";
    import type { PageData } from "./$types";
    import { flip } from "svelte/animate";
    import { cubicIn, cubicInOut, cubicOut } from "svelte/easing";
    import { Tween } from "svelte/motion";
    import QR from "$lib/assets/qr.png";
    import announcer from "$lib/assets/message.webp";
    import explosionSound from "$lib/assets/explosion.ogg";
    import nickelPlush from "$lib/assets/misc/nickel_plush.webp";
    import fiveNickelPlushies from "$lib/assets/misc/Nickel.ogg";
    import { gsap } from "gsap";
    import { Physics2DPlugin } from "gsap/Physics2DPlugin";

    gsap.registerPlugin(Physics2DPlugin);

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
    let broadcastMessage = $state("");
    let broadcastExpiresAt = $state(0);
    const activeExplosions = new Set<{
        layer: HTMLDivElement;
        target: HTMLElement;
        icons: HTMLElement[];
        timeline: ReturnType<typeof gsap.timeline>;
    }>();
    const activeNickels = new Set<{
        element: HTMLImageElement;
        timeline: ReturnType<typeof gsap.timeline>;
    }>();

    const BROADCAST_DURATION = 15 * 60 * 1000;
    const BROADCAST_STORAGE_KEY = "bracketcounter-broadcast";

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
    const dataIsStale = $derived(
        currentDate.getTime() - new Date(buffer.status.updateDate).getTime() > 120_000
        // currentDate.getTime() - new Date(buffer.status.updateDate).getTime() > 100
    );
    const showBroadcast = $derived(
        broadcastMessage.length > 0 && currentDate.getTime() < broadcastExpiresAt
    );
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

        try {
            const storedBroadcast = JSON.parse(
                sessionStorage.getItem(BROADCAST_STORAGE_KEY) ?? "null"
            ) as { message?: unknown; expiresAt?: unknown } | null;

            if (
                typeof storedBroadcast?.message === "string" &&
                typeof storedBroadcast.expiresAt === "number" &&
                storedBroadcast.expiresAt > Date.now()
            ) {
                broadcastMessage = storedBroadcast.message;
                broadcastExpiresAt = storedBroadcast.expiresAt;
            } else {
                sessionStorage.removeItem(BROADCAST_STORAGE_KEY);
            }
        } catch {
            sessionStorage.removeItem(BROADCAST_STORAGE_KEY);
        }

        const handleMeta = (record: SocketMessageData) => {
            const message = record.buffer.meta?.message?.trim();

            if (message) {
                broadcastMessage = message;
                broadcastExpiresAt = Date.now() + BROADCAST_DURATION;
                sessionStorage.setItem(
                    BROADCAST_STORAGE_KEY,
                    JSON.stringify({ message: broadcastMessage, expiresAt: broadcastExpiresAt })
                );
            }
        };

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
            // nextBuffer.config.contestants["a5"][0] = "Naily";

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
                const record = await bc.getOne("3vblfor8xkof2i0");
                if (!cancelled) {
                    handleMeta(record);
                    updateBuffer(record.buffer, false);
                    countsReady = true;
                }
            } catch (error) {
                console.error("Failed to fetch the latest counts", error);
                countsReady = true;
            }

            if (cancelled) return;

            unsubscribe = await bc.subscribe("3vblfor8xkof2i0", (e) => {
                handleMeta(e.record);
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

            for (const explosion of activeExplosions) {
                explosion.timeline.kill();
                explosion.layer.remove();
                gsap.set(explosion.target, { clearProps: "filter" });
                gsap.set(explosion.icons, { clearProps: "transform" });
            }
            activeExplosions.clear();

            for (const nickel of activeNickels) {
                nickel.timeline.kill();
                nickel.element.remove();
            }
            activeNickels.clear();
        };
    });

    function disappearThenFadeIn(target: HTMLElement) {
        gsap.killTweensOf(target, "opacity");
        gsap.set(target, { opacity: 0 });
        gsap.to(target, {
            opacity: 1,
            duration: 5,
            delay: 5,
            ease: "power1.inOut"
        });
    }

    function shake(target: HTMLElement) {
        gsap.to(target, {
            keyframes: [
                ...Array.from({ length: 40 }, () => ({
                    x: gsap.utils.random(-10, 10),
                    y: gsap.utils.random(-10, 10),
                    duration: 0.05,
                    ease: "linear"
                })),
                { x: 0, y: 0, duration: 0.1 }
            ],
            ease: "linear"
        });
    }

    function bounce(target: HTMLElement) {
        gsap.to(target, {
            y: "-=20",
            duration: 0.2,
            repeat: 5,
            yoyo: true,
            ease: "power1.inOut"
        });
    }

    function reflectBetween(value: number, minimum: number, maximum: number) {
        const span = maximum - minimum;
        if (span <= 0) return (minimum + maximum) / 2;

        const period = span * 2;
        const wrapped = (((value - minimum) % period) + period) % period;
        return minimum + (wrapped <= span ? wrapped : period - wrapped);
    }

    function explode(target: HTMLElement) {
        for (const activeExplosion of activeExplosions) {
            activeExplosion.timeline.kill();
            activeExplosion.layer.remove();
            gsap.set(activeExplosion.target, { clearProps: "filter" });
            gsap.set(activeExplosion.icons, { clearProps: "transform" });
        }
        activeExplosions.clear();

        const { left, top, width, height } = target.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;
        const layer = document.createElement("div");
        const icons = Array.from(document.querySelectorAll<HTMLElement>(".cell")).filter((icon) => {
            const rect = icon.getBoundingClientRect();

            return (
                !target.contains(icon) &&
                !icon.contains(target) &&
                rect.left >= 0 &&
                rect.right <= window.innerWidth &&
                rect.top >= -100 &&
                rect.bottom <= window.innerHeight + 100
            );
        });

        layer.className = "bomby-explosion";
        layer.setAttribute("aria-hidden", "true");
        document.body.append(layer);

        let timeline!: ReturnType<typeof gsap.timeline>;
        timeline = gsap.timeline({
            onComplete: () => {
                layer.remove();
                gsap.set(target, { clearProps: "filter" });
                gsap.set(icons, { clearProps: "transform" });
                activeExplosions.delete(explosion);
            }
        });
        const explosion = { layer, target, icons, timeline };
        activeExplosions.add(explosion);

        const chargeDuration = 1.8;

        // How it goes...

        // Charge Up
        timeline.fromTo(
            target,
            { filter: "brightness(1)", transform: "scale(1)" },
            {
                filter: "brightness(5)",
                transform: "scale(3)",
                duration: chargeDuration,
                ease: "expo.in"
            },
            0
        );

        timeline.call(
            () => {
                void new Audio(explosionSound).play().catch(() => undefined);
            },
            undefined,
            chargeDuration
        );

        // hide
        timeline.add(() => {
            gsap.set("#b8", { opacity: 0 });
        });

        const viewportDiagonal = Math.hypot(window.innerWidth, window.innerHeight);
        const blastDuration = 2;

        // fade in
        timeline.add(() => {
            gsap.to(target, {
                transform: "",
                filter: "",
                duration: 2,
                delay: blastDuration
            });
            gsap.to("#b8", {
                opacity: 1,
                duration: 2,
                delay: blastDuration
            });
        });

        for (const icon of icons) {
            const iconRect = icon.getBoundingClientRect();
            const dx = iconRect.left + iconRect.width / 2 - x;
            const dy = iconRect.top + iconRect.height / 2 - y;
            const distance = Math.hypot(dx, dy);
            const proximity = 1 - Math.min(distance / viewportDiagonal, 1);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI + gsap.utils.random(-20, 20);
            const minimumX = -iconRect.left;
            const maximumX = window.innerWidth - iconRect.right;
            const minimumY = -iconRect.top;
            const maximumY = window.innerHeight - iconRect.bottom;
            const setX = gsap.quickSetter(icon, "x", "px");
            const setY = gsap.quickSetter(icon, "y", "px");

            timeline.to(
                icon,
                {
                    duration: blastDuration,
                    physics2D: {
                        angle,
                        velocity: 500 + proximity * 10 * 360,
                        // gravity: gsap.utils.random(80, 220),
                        friction: 0.1
                    },
                    onUpdate: () => {
                        const rawX = Number.parseFloat(String(gsap.getProperty(icon, "x"))) || 0;
                        const rawY = Number.parseFloat(String(gsap.getProperty(icon, "y"))) || 0;

                        setX(reflectBetween(rawX, minimumX, maximumX - 10));
                        setY(reflectBetween(rawY, minimumY, maximumY - 10));
                    }
                },
                chargeDuration
            );
            timeline.to(
                icon,
                {
                    x: 0,
                    y: 0,
                    rotation: 0,
                    duration: 3,
                    ease: "elastic.out(0.8, 0.7)"
                },
                chargeDuration + blastDuration + gsap.utils.random(0.02, 0.14)
            );
        }
    }

    function rainbow(target: HTMLElement) {
        gsap.to(target, {
            filter: "hue-rotate(720deg)",
            duration: 2,
            ease: "linear"
        }).then(() => {
            gsap.to(target, {
                filter: "hue-rotate(0deg)",
                duration: 0
            });
        });
    }

    let presses = 0;
    function nickel(_target: HTMLElement) {
        presses++;
        if (presses < 5) return;

        const lifetime = 10;

        new Audio(fiveNickelPlushies).play().catch(() => undefined);

        for (let i = 0; i < 5; i++) {
            const nickelIcon = document.createElement("img");
            const width = Math.min(196, Math.max(52, window.innerWidth * 0.32));
            const height = width * (443 / 356);
            // const x = ((i + 0.5) / 5) * window.innerWidth - width / 2;

            nickelIcon.className = "nickel-icon";
            nickelIcon.src = nickelPlush;
            nickelIcon.alt = "";
            nickelIcon.setAttribute("aria-hidden", "true");
            nickelIcon.draggable = false;
            nickelIcon.style.width = `${width}px`;
            nickelIcon.style.height = `${height}px`;
            nickelIcon.style.top = `${-height}px`;
            document.body.append(nickelIcon);

            const setX = gsap.quickSetter(nickelIcon, "x", "px");
            const setY = gsap.quickSetter(nickelIcon, "y", "px");
            const timeline = gsap.timeline({
                // delay: i * 0.12,
                onComplete: () => {
                    nickelIcon.remove();
                    activeNickels.delete(animation);
                }
            });
            const animation = { element: nickelIcon, timeline };
            activeNickels.add(animation);

            gsap.set(nickelIcon, {
                x: gsap.utils.random(0, window.innerWidth),
                y: gsap.utils.random(0, window.innerHeight),
                rotation: gsap.utils.random(-25, 25)
            });
            timeline.to(
                nickelIcon,
                {
                    duration: lifetime,
                    rotation: `+=${gsap.utils.random(-1_080, 1_080) * 3}`,
                    // ease: "expo.in",
                    physics2D: {
                        // angle: gsap.utils.random(65, 115),
                        angle: gsap.utils.random(0, 360),
                        velocity: gsap.utils.random(2, 6) * width
                    },
                    onUpdate: () => {
                        const rawX =
                            Number.parseFloat(String(gsap.getProperty(nickelIcon, "x"))) || 0;
                        const rawY =
                            Number.parseFloat(String(gsap.getProperty(nickelIcon, "y"))) || 0;
                        const maximumX = Math.max(0, window.innerWidth - width);
                        const maximumY = Math.max(0, window.innerHeight);

                        setX(reflectBetween(rawX, 0, maximumX - 10));
                        setY(reflectBetween(rawY, height, maximumY));
                    }
                },
                0
            );
            timeline.to(nickelIcon, { opacity: 0, duration: 1, ease: "power1.in" }, lifetime - 1);
        }

        presses = 0;
    }

    const animations: Partial<Record<string, (target: HTMLElement) => void>> = {
        Bomby: explode,
        "Yellow Face": shake,
        Bubble: disappearThenFadeIn,
        Naily: bounce,
        Puffball: rainbow,
        Nickel: nickel
    };

    function handleContestantClick(name: string, event: MouseEvent) {
        playContestantSound(name);
        animations[name]?.(event.currentTarget as HTMLElement);
    }
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

{#snippet cell(contestant: Contestant)}
    {@const nameColor = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const color = "color-mix(in oklab, " + contestant.color + " 100%, white)"}
    {@const image = Characters[`/src/lib/assets/icons/${contestant.name}.png`]?.default}
    {@const sound = Sounds[`/src/lib/assets/sounds/${contestant.name}.ogg`]?.default}
    {@const votes = barWidth[contestant.id].votes.current}
    <!-- {#if votes > 0} -->
    <div class="cell h-full w-full grow items-center" id={contestant.id}>
        <div
            class="bar-container flex h-full w-full justify-center overflow-visible rounded-md drop-shadow-xl"
        >
            <div
                class="bar flex h-full flex-col justify-center rounded-md leading-4 drop-shadow-xs"
            >
                <!-- style="background-color: {contestant.color};" -->
                <button
                    type="button"
                    class={["m-auto enabled:cursor-pointer disabled:cursor-default"]}
                    disabled={!sound && !animations[contestant.name]}
                    onclick={(event) => handleContestantClick(contestant.name, event)}
                >
                    {#if image}
                        <enhanced:img
                            src={image}
                            alt={contestant.name}
                            class="contestant-icon h-24 w-24"
                            // class="contestant-icon h-24 w-24 max-sm:h-20 max-sm:w-20"
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

                <div class="percentage flex h-10 items-center justify-center max-lg:text-sm">
                    <span
                        class="flex font-bold tabular-nums brightness-150 text-shadow-sm max-lg:text-2xl max-sm:text-shadow-md"
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

<div class="mobile-logo sm:hidden">
    <BCLOGO_LONG />
</div>
<nav class="flex flex-col gap-2 text-white" bind:clientHeight={navHeight}>
    <section class="flex items-center justify-between gap-2 max-sm:flex-col">
        <div class="text-xs">
            <div
                class="flex items-center justify-center gap-2 text-lg max-lg:flex-col max-lg:pt-2 max-sm:gap-1 max-sm:text-sm lg:gap-10"
            >
                <div class="flex items-center gap-10 max-sm:w-full max-sm:flex-col max-sm:gap-1">
                    <div class="max-sm:hidden">
                        <BCLOGO width={548 / 2} height={137 / 2} />
                    </div>
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
    <div class="mb-5 flex items-center justify-between gap-2 max-sm:flex-col-reverse">
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
        <section class="vote-summary">
            <div class="total-votes text-2xl font-bold max-lg:text-4xl">
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
                        class={[
                            "mx-1 inline-block h-2 w-2 animate-ping rounded-full",
                            dataIsStale ? "bg-orange-500" : "bg-green-500"
                        ]}
                    ></div>
                    <div
                        class={[
                            "relative right-4.75 mx-1 inline-block h-2 w-2 rounded-full",
                            dataIsStale ? "bg-orange-500" : "bg-green-500"
                        ]}
                    ></div>
                    <span class="relative right-4.75" aria-live="polite">
                        {#if dataIsStale}
                            Counts may be outdated... please refresh your browser! Updated {lastUpdated}
                        {:else}
                            Updated {lastUpdated}
                        {/if}
                    </span>
                {/if}
            </div>
        </section>
        {#if showBroadcast}
            <div class="flex items-center gap-2">
                <aside
                    class="broadcast rounded-r-full bg-blue-800 py-3 pr-6 pl-3 text-2xl font-bold wrap-normal"
                    role="status"
                    aria-live="polite"
                >
                    {@html broadcastMessage}
                </aside>
                <img src={announcer} alt="" class="h-14" />
            </div>
        {/if}
    </div>
</nav>
<!-- <main class="mb-10 w-full grow" style="max-height: calc(100vh - {navHeight}px - 150px);"> -->
<main class="mb-10 w-full grow">
    <div class={["shabang", !countsReady && "invisible"]}>
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

    @media (width < 540px) {
        .shabang {
            grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
            gap: 0;
        }
    }

    @media (width < 40rem) {
        .mobile-logo {
            width: 95%;
            margin: auto;
            padding-top: 5px;
        }

        .mobile-logo :global(svg) {
            display: block;
            width: 100%;
            height: auto;
        }

        .vote-summary {
            width: 100%;
        }

        .total-votes {
            container-type: inline-size;
        }

        .total-votes p {
            font-size: 9.75cqi;
            line-height: 1.1;
            white-space: nowrap;
        }
    }

    .broadcast {
        corner-shape: superellipse(0);
    }

    /* .toggle-btn {
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
    } */

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

    :global(.bomby-explosion) {
        position: fixed;
        inset: 0;
        z-index: 100;
        overflow: hidden;
        pointer-events: none;
    }

    :global(.nickel-icon) {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 110;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        will-change: transform, opacity;
        filter: drop-shadow(0 8px 8px rgb(0 0 0 / 0.35));
    }

    /* :global(.bomby-flash) {
        position: absolute;
        will-change: transform, opacity;
    }

    :global(.bomby-flash) {
        width: 64px;
        height: 64px;
        border-radius: 999px;
        background: radial-gradient(circle, white 0 12%, #ffe970 26%, #ff7417 53%, transparent 72%);
        filter: drop-shadow(0 0 20px #ff9d19);
    } */

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
