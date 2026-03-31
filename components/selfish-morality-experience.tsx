"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { slides, type Slide } from "@/lib/slides";

const swipeThreshold = 50;
const BASE_TEXT_REVEAL_MS = 1500;
const EXTRA_TEXT_REVEAL_MS_PER_PARAGRAPH = 220;
const BASE_POST_TEXT_HOLD_MS = 0;
const EXTRA_POST_TEXT_HOLD_MS_PER_PARAGRAPH = 0;
const VIDEO_PLAYBACK_RATE = 0.35;

function emphasizeSelfishReason(text: string) {
  const normalized = text.trimStart();
  const prefix = /^the selfish reason/i;

  if (!prefix.test(normalized)) return text;

  const leadingWhitespace = text.slice(0, text.length - normalized.length);
  const match = normalized.match(prefix);
  if (!match) return text;

  const fullMatch = match[0];
  const lowerMatch = fullMatch.toLowerCase();
  const selfishReasonIndex = lowerMatch.indexOf("selfish reason");
  const before = fullMatch.slice(0, selfishReasonIndex);
  const emphasized = fullMatch.slice(selfishReasonIndex);
  const rest = normalized.slice(fullMatch.length);

  return (
    <>
      {leadingWhitespace}
      {before}
      <em className="italic text-[#1f1712] not-italic:[font-style:italic]">{emphasized}</em>
      {rest}
    </>
  );
}

type ScenePhase = "intro" | "text" | "hold" | "play" | "ended";

const SCENE_TRANSITION_MS = 860;

type SceneVideoProps = {
  slide: Slide;
  resetNonce: number;
  onReady: () => void;
  onEnded: (frameDataUrl?: string) => void;
  autoplay: boolean;
};

function SceneVideo({ slide, resetNonce, onReady, onEnded, autoplay }: SceneVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playTimerRef = useRef<number | null>(null);
  const hasEndedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.playbackRate = VIDEO_PLAYBACK_RATE;
    video.loop = true;
    video.autoplay = false;

    const markReady = () => onReady();

    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);

    video.pause();
    video.currentTime = 0;
    hasEndedRef.current = false;
    hasStartedRef.current = false;

    if (video.readyState >= 1) {
      onReady();
    }

    video.load();

    const tryPlay = () => {
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;
      video.playbackRate = VIDEO_PLAYBACK_RATE;
      void video.play().catch(() => {
        // ignore playback failures; muted + playsInline should cover most cases
      });
    };

    if (autoplay) {
      const delay = hasMountedRef.current ? 0 : BASE_TEXT_REVEAL_MS;
      playTimerRef.current = window.setTimeout(tryPlay, delay);
    }
    hasMountedRef.current = true;

    return () => {
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
      if (playTimerRef.current !== null) {
        window.clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [onReady, resetNonce, slide.id, autoplay]);

  return (
    <div className="absolute inset-0 z-30">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        preload="auto"
        aria-label={slide.alt}
        onCanPlay={onReady}
        onEnded={() => undefined}
      >
        <source src={slide.video.replace(/\.mp4$/i, ".webm")} type="video/webm" />
        <source src={slide.video} type="video/mp4" />
      </video>
    </div>
  );
}

function SceneVideoSwap({
  slide,
  resetNonce,
  onReady,
  onEnded,
  autoplay,
}: SceneVideoProps) {
  const [displayedSlide, setDisplayedSlide] = useState(slide);
  const [pendingSlide, setPendingSlide] = useState<Slide | null>(null);
  const [pendingReady, setPendingReady] = useState(false);

  useEffect(() => {
    if (slide.id === displayedSlide.id) return;
    setPendingSlide(slide);
    setPendingReady(false);
  }, [displayedSlide.id, slide]);

  useEffect(() => {
    if (!pendingSlide || !pendingReady) return;
    setDisplayedSlide(pendingSlide);
    setPendingSlide(null);
    setPendingReady(false);
  }, [pendingReady, pendingSlide]);

  return (
    <>
      <SceneVideo
        slide={displayedSlide}
        resetNonce={resetNonce}
        onReady={onReady}
        onEnded={onEnded}
        autoplay={autoplay}
      />

      {pendingSlide ? (
        <div className="pointer-events-none absolute inset-0 opacity-0">
          <SceneVideo
            slide={pendingSlide}
            resetNonce={resetNonce}
            onReady={() => setPendingReady(true)}
            onEnded={onEnded}
            autoplay={autoplay}
          />
        </div>
      ) : null}
    </>
  );
}

function SceneContent({
  slide,
  index,
  direction,
  total,
  onGoTo,
  onGoNext,
  onGoPrev,
  onReplay,
  canGoNext,
  canGoPrev,
  canNavigate,
  phase,
  reduced,
  isVideoReady,
  replayNonce,
  showDesktopVideo,
  onVideoReady,
  onVideoEnded,
}: {
  slide: Slide;
  index: number;
  direction: number;
  total: number;
  onGoTo: (nextIndex: number) => void;
  onGoNext: () => void;
  onGoPrev: () => void;
  onReplay: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  canNavigate: boolean;
  phase: ScenePhase;
  reduced: boolean;
  isVideoReady: boolean;
  replayNonce: number;
  showDesktopVideo: boolean;
  onVideoReady: () => void;
  onVideoEnded: (frameDataUrl?: string) => void;
}) {
  const textVisible = phase !== "intro";
  const stableVisualPhase = phase === "intro" ? "intro" : "hold";
  const showReplayButton = false;

  return (
    <>
      <div className="relative flex h-full flex-col gap-0 overflow-hidden lg:hidden">
        <motion.div
          className="relative left-1/2 h-[44dvh] w-screen min-h-0 shrink-0 -translate-x-1/2 overflow-hidden rounded-none border-x-0 border-y-0 border-black/8 bg-[#dfd4c2] shadow-[0_25px_80px_rgba(21,14,10,0.16)] sm:h-[46dvh]"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reduced ? 0.18 : 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="absolute inset-0 z-30"
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0.18 : 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <SceneVideoSwap
              slide={slide}
              resetNonce={replayNonce}
              onReady={onVideoReady}
              onEnded={onVideoEnded}
              autoplay={phase !== "ended"}
            />
          </motion.div>

          <motion.div
            aria-hidden
            className="absolute inset-0 z-10"
            initial={false}
            animate={{ opacity: 0 }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 8, ease: "easeInOut" }}
            style={{
              background: `radial-gradient(circle at 82% 26%, ${slide.palette.glow}, transparent 30%), linear-gradient(180deg, rgba(255,252,248,0.04), rgba(255,250,244,0.08))`,
            }}
          />
        </motion.div>

        <div className="relative z-40 -mt-6 overflow-hidden px-3 pb-6 sm:-mt-8 sm:px-5 sm:pb-8">
          <div className="relative min-h-[34dvh] overflow-hidden rounded-[1.2rem] border border-black/10 bg-white/88 p-4 shadow-[0_20px_60px_rgba(21,14,10,0.12)] backdrop-blur-[16px] sm:min-h-[32dvh]">
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
              initial={false}
              animate={{ opacity: [0.14, 0.3, 0.14], scale: [0.95, 1.04, 0.95] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 10, ease: "easeInOut" }}
              style={{ background: slide.palette.glow }}
            />

            <div className="relative">
              <h1 className="text-[2.2rem] leading-[0.92] font-semibold tracking-[-0.05em] text-[#db0042] sm:text-[2.8rem]">
                {slide.title}
              </h1>

              <div className="overflow-hidden pt-[10px] pb-[10px]">
                <div className="space-y-2.5">
                  {slide.quote.map((paragraph, paragraphIndex) => (
                    <p
                      key={`${slide.slug}-mobile-${paragraphIndex}`}
                      className="text-[0.98rem] leading-[1.36] text-[#2c221c]/86 sm:text-[1.02rem]"
                    >
                      {emphasizeSelfishReason(paragraph)}
                    </p>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden space-y-3 border-t border-black/8 pt-[10px]">
                <div className="flex items-center justify-center gap-3 py-[15px]">
                  {Array.from({ length: total }).map((_, dotIndex) => (
                    <button
                      key={`mobile-dot-${dotIndex}`}
                      type="button"
                      aria-label={`Go to virtue ${dotIndex + 1}`}
                      onClick={() => onGoTo(dotIndex)}
                      disabled={!canNavigate}
                      aria-disabled={!canNavigate}
                      className="relative flex items-center justify-center transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-55"
                      style={{
                        width: "1.1rem",
                        height: "1.1rem",
                        transform: dotIndex % 2 === 0 ? "rotate(-5deg)" : "rotate(4deg)",
                      }}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full border-2"
                        style={{
                          borderColor: "rgba(0,0,0,0.92)",
                          borderRadius: dotIndex % 2 === 0 ? "56% 44% 52% 48% / 48% 56% 44% 52%" : "49% 51% 45% 55% / 53% 47% 57% 43%",
                          transform: dotIndex % 2 === 0 ? "rotate(-6deg) scale(1.02)" : "rotate(7deg) scale(0.98)",
                        }}
                      />
                      {dotIndex === index ? (
                        <span
                          aria-hidden
                          className="absolute inset-[0.15rem] rounded-full bg-[#db0042]"
                          style={{
                            borderRadius: dotIndex % 2 === 0 ? "58% 42% 47% 53% / 46% 55% 45% 54%" : "52% 48% 56% 44% / 49% 53% 47% 51%",
                            transform: dotIndex % 2 === 0 ? "rotate(8deg)" : "rotate(-7deg)",
                          }}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <motion.div
        className="relative hidden min-h-[34vh] overflow-hidden rounded-[1.35rem] border border-black/8 bg-[#dfd4c2] shadow-[0_35px_120px_rgba(56,35,22,0.18)] sm:min-h-[44vh] lg:order-2 lg:flex lg:h-[100dvh] lg:min-h-0 lg:max-h-[100dvh] lg:rounded-none lg:border-x lg:border-y-0"
        initial={reduced ? false : { opacity: 0, x: direction * 42, y: 18, scale: 1.02, rotate: direction * 0.45 }}
        animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, x: direction * -52, y: -10, scale: 0.986, rotate: direction * -0.35 }
        }
        transition={{ duration: reduced ? 0.18 : 0.86, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-40"
          initial={false}
          animate={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.18 : 0.9, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: "linear-gradient(180deg, rgba(255,251,246,0.96), rgba(255,248,241,0.92))" }}
        />

        <motion.div
          aria-hidden
          className="absolute inset-0 z-10"
          initial={false}
          animate={{ opacity: 0 }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 8, ease: "easeInOut" }}
          style={{
            background: `radial-gradient(circle at 22% 18%, rgba(255,255,255,0.72), transparent 24%), radial-gradient(circle at 82% 26%, ${slide.palette.glow}, transparent 30%), linear-gradient(180deg, rgba(255,252,248,0.10), rgba(255,250,244,0.18))`,
          }}
        />

        <motion.div
          aria-hidden
          className="absolute inset-0 z-10"
          initial={false}
          animate={{ opacity: 0 }}
          style={{ background: "linear-gradient(180deg, rgba(255,250,245,0.24), rgba(255,250,245,0.08))" }}
        />

        <motion.div
          className="absolute inset-0 z-30"
          initial={false}
          animate={{ opacity: showDesktopVideo ? 1 : 0 }}
          transition={{ duration: showDesktopVideo ? 0.22 : 0 }}
        >
          <SceneVideoSwap
            slide={slide}
            resetNonce={replayNonce}
            onReady={onVideoReady}
            onEnded={onVideoEnded}
            autoplay={phase !== "ended"}
          />
        </motion.div>

        {!showDesktopVideo ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[rgba(0,0,0,0.02)]">
            <span className="text-[11px] font-semibold tracking-[0.35em] text-white sm:text-xs">
              LOADING...
            </span>
          </div>
        ) : null}

        <motion.div
          aria-hidden
          className="absolute inset-y-0 left-0 z-10 w-[58%]"
          initial={false}
          animate={{ opacity: 0, width: "52%" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background:
              "linear-gradient(90deg, rgba(255,252,247,0.94) 0%, rgba(255,251,245,0.82) 34%, rgba(255,250,243,0.42) 58%, rgba(255,249,241,0.12) 80%, transparent 100%)",
          }}
        />

        <motion.div
          aria-hidden
          className="absolute inset-x-0 bottom-0 z-10 h-[42%]"
          initial={false}
          animate={{ opacity: 0 }}
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(255,251,246,0.18) 24%, rgba(255,248,241,0.72) 100%)" }}
        />

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 border-x border-y-0 border-white/14" />

        <div className="absolute right-1.5 top-1.5 z-30 sm:right-3 sm:top-3 lg:right-4 lg:top-4 xl:right-5 xl:top-5">
          <div
            className="rounded-full border px-4 py-2 text-xs tracking-[0.28em] text-[var(--muted)] shadow-[0_10px_30px_rgba(60,41,28,0.08)] backdrop-blur-sm sm:text-sm"
            style={{ background: slide.palette.panel, borderColor: slide.palette.edge }}
          >
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>
        </div>

        {showReplayButton ? (
          <div className="absolute inset-0 z-30 flex items-end justify-center p-4 sm:p-6 lg:p-8">
            <button
              type="button"
              onClick={onReplay}
              className="rounded-full border border-white/22 bg-black/28 px-5 py-2.5 text-sm font-medium text-white shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:scale-[1.01] hover:bg-black/36"
            >
              Replay
            </button>
          </div>
        ) : null}
      </motion.div>

      <motion.div
        className="relative z-40 hidden px-2 pb-2 lg:order-1 lg:-mr-20 lg:-mt-0 lg:flex lg:items-center lg:px-0 xl:-mr-24"
        initial={
          reduced
            ? false
            : { opacity: 0, x: direction * -58, y: 34, scale: 0.975, rotate: direction * -0.45 }
        }
        animate={
          reduced
            ? { opacity: 1 }
            : { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }
        }
        exit={
          reduced
            ? { opacity: 0 }
            : { opacity: 0, x: direction * 48, y: 12, scale: 1.01, rotate: direction * 0.25 }
        }
        transition={{ duration: reduced ? 0.18 : 0.8, ease: [0.22, 1, 0.36, 1], delay: reduced ? 0 : 0.06 }}
      >
        <motion.div
          className="relative w-full max-w-[44rem] overflow-hidden rounded-[0.72rem] border p-1.25 shadow-[0_30px_80px_rgba(21,14,10,0.16)] backdrop-blur-[18px] sm:rounded-[2rem] sm:p-7 lg:max-w-[41rem] lg:rounded-[2.5rem] lg:p-10 xl:max-w-[43rem] xl:p-12"
          initial={false}
          animate={
            reduced
              ? { x: 0, y: 0, scale: 1, opacity: 1 }
              : stableVisualPhase === "intro"
                ? { x: 10, y: 10, scale: 0.985, opacity: 0.94 }
                : { x: 0, y: 0, scale: 1, opacity: 1 }
          }
          transition={{ duration: reduced ? 0.18 : 0.82, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,252,247,0.74)), linear-gradient(180deg, rgba(255,248,241,0.94), rgba(248,239,229,0.84))`,
            borderColor: "rgba(110,84,67,0.12)",
          }}
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl"
            initial={false}
            animate={{ opacity: [0.16, 0.34, 0.16], scale: [0.94, 1.06, 0.94] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 10, ease: "easeInOut" }}
            style={{ background: slide.palette.glow }}
          />

          <motion.div
            initial={false}
            animate={
              textVisible
                ? { opacity: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, y: 20, filter: "blur(10px)" }
            }
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="max-w-3xl text-[1.56rem] leading-[0.9] font-semibold tracking-[-0.045em] text-[#db0042] sm:text-6xl lg:text-[5.4rem] xl:text-[6.3rem]">
              {slide.title}
            </h1>
          </motion.div>

          <motion.div
            initial={false}
            animate={
              textVisible
                ? { opacity: 1, maxHeight: 320, marginTop: 6 }
                : { opacity: 0, maxHeight: 0, marginTop: 0 }
            }
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden pt-[10px] pb-[10px] sm:mt-7 sm:max-h-[420px] sm:space-y-6 lg:mt-8"
          >
            <div className="space-y-1 sm:space-y-6">
              {slide.quote.map((paragraph, paragraphIndex) => (
                <motion.p
                  key={`${slide.slug}-${paragraphIndex}`}
                  initial={false}
                  animate={
                    textVisible
                      ? { opacity: 1, y: 0, filter: "blur(0px)" }
                      : { opacity: 0, y: 24, filter: "blur(14px)" }
                  }
                  transition={{
                    delay: textVisible ? paragraphIndex * 0.14 : 0,
                    duration: 0.82,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="max-w-2xl text-[0.78rem] leading-[1.32] text-[#2c221c]/86 sm:text-[1.35rem] lg:text-[1.5rem]"
                >
                  {emphasizeSelfishReason(paragraph)}
                </motion.p>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={false}
            animate={
              textVisible
                ? { opacity: 1, y: 0, maxHeight: 220, marginTop: 8, paddingTop: 6 }
                : { opacity: 0, y: 10, maxHeight: 0, marginTop: 0, paddingTop: 0 }
            }
            transition={{ delay: textVisible ? 0.12 : 0, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden space-y-1 border-t border-white/10 sm:mt-8 sm:max-h-[260px] sm:space-y-5 sm:pt-6"
          >
            <div className="grid gap-4 text-xs sm:grid-cols-[1fr_auto] sm:items-end sm:text-sm">
              <div className="space-y-1.5 text-[#3f3129]/62">
                {!canNavigate ? <span className="block text-[10px] uppercase tracking-[0.24em] text-[#4a3a31]/50 sm:text-[11px]">Transitioning to next scene</span> : null}
              </div>
              <div className="flex items-center gap-3 justify-self-start sm:justify-self-end">
                {Array.from({ length: total }).map((_, dotIndex) => (
                  <button
                    key={dotIndex}
                    type="button"
                    aria-label={`Go to virtue ${dotIndex + 1}`}
                    onClick={() => onGoTo(dotIndex)}
                    disabled={!canNavigate}
                    aria-disabled={!canNavigate}
                    className="relative flex items-center justify-center transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-55"
                    style={{
                      width: "1.2rem",
                      height: "1.2rem",
                      transform: dotIndex % 2 === 0 ? "rotate(-5deg)" : "rotate(4deg)",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full border-2"
                      style={{
                        borderColor: "rgba(0,0,0,0.92)",
                        borderRadius: dotIndex % 2 === 0 ? "56% 44% 52% 48% / 48% 56% 44% 52%" : "49% 51% 45% 55% / 53% 47% 57% 43%",
                        transform: dotIndex % 2 === 0 ? "rotate(-6deg) scale(1.02)" : "rotate(7deg) scale(0.98)",
                      }}
                    />
                    {dotIndex === index ? (
                      <span
                        aria-hidden
                        className="absolute inset-[0.16rem] rounded-full bg-[#db0042]"
                        style={{
                          borderRadius: dotIndex % 2 === 0 ? "58% 42% 47% 53% / 46% 55% 45% 54%" : "52% 48% 56% 44% / 49% 53% 47% 51%",
                          transform: dotIndex % 2 === 0 ? "rotate(8deg)" : "rotate(-7deg)",
                        }}
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div />
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2.5">
                <button
                  type="button"
                  onClick={onGoNext}
                  disabled={!canGoNext || !canNavigate}
                  aria-disabled={!canGoNext || !canNavigate}
                  className="w-full rounded-full px-5 py-2.5 text-sm font-medium text-[#1c130f] shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition enabled:hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45 sm:order-2 sm:w-auto"
                  style={{ background: "#000000", color: "rgba(255,255,255,0.97)" }}
                >
                  {canGoNext ? "Next" : "End"}
                </button>
                {canGoPrev ? (
                  <button
                    type="button"
                    onClick={onGoPrev}
                    disabled={!canNavigate}
                    aria-disabled={!canNavigate}
                    className="self-start rounded-full border border-white/18 bg-black/18 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/88 transition enabled:hover:border-white/38 enabled:hover:bg-black/28 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:order-1 sm:self-auto sm:px-4 sm:py-2 sm:text-sm sm:normal-case sm:tracking-normal sm:text-white/94"
                  >
                    Previous
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
}

function SceneStage({
  slide,
  index,
  direction,
  total,
  onGoTo,
  onGoNext,
  onGoPrev,
  canGoNext,
  canGoPrev,
  canNavigate,
  reduced,
  onPhaseChange,
  isMobile,
  isShortViewport,
}: {
  slide: Slide;
  index: number;
  direction: number;
  total: number;
  onGoTo: (nextIndex: number) => void;
  onGoNext: () => void;
  onGoPrev: () => void;
  canGoNext: boolean;
  canGoPrev: boolean;
  canNavigate: boolean;
  reduced: boolean;
  onPhaseChange?: (phase: ScenePhase) => void;
  isMobile: boolean;
  isShortViewport: boolean;
}) {
  const [phase, setPhase] = useState<ScenePhase>(reduced ? "ended" : "intro");
  const [isVideoReady, setIsVideoReady] = useState(reduced);
  const [replayNonce, setReplayNonce] = useState(0);
  const [showMobileVideo, setShowMobileVideo] = useState(reduced);
  const [showDesktopVideo, setShowDesktopVideo] = useState(reduced);
  const textRevealMs = BASE_TEXT_REVEAL_MS + Math.max(0, slide.quote.length - 1) * EXTRA_TEXT_REVEAL_MS_PER_PARAGRAPH;
  const postTextHoldMs = BASE_POST_TEXT_HOLD_MS + Math.max(0, slide.quote.length - 1) * EXTRA_POST_TEXT_HOLD_MS_PER_PARAGRAPH;

  useEffect(() => {
    onPhaseChange?.(reduced ? "ended" : phase);
  }, [onPhaseChange, phase, reduced]);

  useEffect(() => {
    if (reduced) return;

    const introTimer = window.setTimeout(() => setPhase("text"), 120);
    const holdTimer = window.setTimeout(() => setPhase("hold"), textRevealMs);

    return () => {
      window.clearTimeout(introTimer);
      window.clearTimeout(holdTimer);
    };
  }, [reduced, slide.id, textRevealMs]);

  useEffect(() => {
    if (reduced || phase !== "hold") return;

    const playTimer = window.setTimeout(() => setPhase("play"), postTextHoldMs);
    return () => window.clearTimeout(playTimer);
  }, [phase, postTextHoldMs, reduced, slide.id]);

  useEffect(() => {
    if (!isMobile) {
      setShowMobileVideo(true);
      return;
    }
    if (reduced) {
      setShowMobileVideo(true);
      return;
    }

    setShowMobileVideo(false);
    const timer = window.setTimeout(() => {
      if (isVideoReady) setShowMobileVideo(true);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [isMobile, reduced, slide.id, isVideoReady]);

  useEffect(() => {
    if (!isMobile || reduced) return;
    if (!isVideoReady) return;

    const timer = window.setTimeout(() => setShowMobileVideo(true), 1600);
    return () => window.clearTimeout(timer);
  }, [isMobile, reduced, isVideoReady, slide.id]);

  useEffect(() => {
    if (isMobile) {
      setShowDesktopVideo(true);
      return;
    }
    if (reduced) {
      setShowDesktopVideo(true);
      return;
    }

    setShowDesktopVideo(false);
    const timer = window.setTimeout(() => {
      if (isVideoReady) setShowDesktopVideo(true);
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [isMobile, reduced, slide.id, isVideoReady]);

  useEffect(() => {
    if (isMobile || reduced) return;
    if (!isVideoReady) return;

    const timer = window.setTimeout(() => setShowDesktopVideo(true), 1600);
    return () => window.clearTimeout(timer);
  }, [isMobile, reduced, isVideoReady, slide.id]);

  if (isMobile) {
    return (
      <article className="grid h-[100dvh] w-full grid-cols-1 overflow-hidden px-0 pb-0 pt-16 sm:pt-20">
        <div className="relative flex h-full flex-col gap-0 overflow-hidden">
          <div className="relative left-1/2 h-[44dvh] w-screen min-h-0 shrink-0 -translate-x-1/2 overflow-hidden rounded-none border-x-0 border-y-0 border-black/8 bg-[#dfd4c2] shadow-[0_25px_80px_rgba(21,14,10,0.16)] sm:h-[46dvh]">
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={`mobile-video-${slide.id}`}
                className="absolute inset-0 z-30"
                initial={false}
                animate={{ opacity: showMobileVideo ? 1 : 0 }}
                exit={{ opacity: 1 }}
                transition={{ duration: showMobileVideo ? 0.22 : 0 }}
              >
                <SceneVideoSwap
                  slide={slide}
                  resetNonce={replayNonce}
                  onReady={() => setIsVideoReady(true)}
                  onEnded={() => setPhase("ended")}
                  autoplay={phase !== "ended"}
                />
              </motion.div>
            </AnimatePresence>

            <motion.div
              aria-hidden
              className="absolute inset-0 z-10"
              initial={false}
              animate={{ opacity: 0 }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 8, ease: "easeInOut" }}
              style={{
                background: `radial-gradient(circle at 82% 26%, ${slide.palette.glow}, transparent 30%), linear-gradient(180deg, rgba(255,252,248,0.04), rgba(255,250,244,0.08))`,
              }}
            />

            {!showMobileVideo ? (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[rgba(0,0,0,0.02)]">
                <span className="text-[11px] font-semibold tracking-[0.35em] text-white sm:text-xs">
                  LOADING...
                </span>
              </div>
            ) : null}
          </div>

          <div className="relative z-40 -mt-6 overflow-hidden px-[20px] pb-6 sm:-mt-8 sm:px-5 sm:pb-8">
            <div className={`relative min-h-[34dvh] rounded-[1.2rem] border border-black/10 bg-white/88 p-4 shadow-[0_10px_22px_rgba(21,14,10,0.06),0_28px_65px_rgba(21,14,10,0.045)] backdrop-blur-[16px] sm:min-h-[32dvh] ${isShortViewport ? "max-h-[48dvh] overflow-y-auto" : "overflow-hidden"}`}>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl"
                initial={false}
                animate={{ opacity: [0.14, 0.3, 0.14], scale: [0.95, 1.04, 0.95] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 10, ease: "easeInOut" }}
                style={{ background: slide.palette.glow }}
              />

              <AnimatePresence initial={false} custom={direction} mode="sync">
                <motion.div
                  key={`mobile-card-content-${slide.id}`}
                  custom={direction}
                  className="relative"
                  initial={reduced ? false : { x: direction * 72, opacity: 1 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={reduced ? { opacity: 0 } : { x: direction * -72, opacity: 1 }}
                  transition={{ duration: reduced ? 0.18 : 0.38, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h1 className="text-[2.2rem] leading-[0.92] font-semibold tracking-[-0.05em] text-[#db0042] sm:text-[2.8rem]">
                    {slide.title}
                  </h1>

                  <div className="overflow-hidden pt-[10px] pb-[10px]">
                    <div className="space-y-2.5">
                      {slide.quote.map((paragraph, paragraphIndex) => (
                        <p
                          key={`${slide.slug}-mobile-${paragraphIndex}`}
                          className="text-[1.06rem] leading-[1.5] text-[#2c221c]/86 sm:text-[1.1rem]"
                        >
                          {emphasizeSelfishReason(paragraph)}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="mt-[10px] overflow-hidden space-y-3 border-t border-black/8 pt-[10px]">
                    <div className="flex items-center justify-center gap-3 py-[15px]">
                      {Array.from({ length: total }).map((_, dotIndex) => (
                        <button
                          key={`mobile-dot-${dotIndex}`}
                          type="button"
                          aria-label={`Go to virtue ${dotIndex + 1}`}
                          onClick={() => onGoTo(dotIndex)}
                          disabled={!canNavigate}
                          aria-disabled={!canNavigate}
                          className="relative flex items-center justify-center transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-55"
                          style={{
                            width: "1.1rem",
                            height: "1.1rem",
                            transform: dotIndex % 2 === 0 ? "rotate(-5deg)" : "rotate(4deg)",
                          }}
                        >
                          <span
                            aria-hidden
                            className="absolute inset-0 rounded-full border-2"
                            style={{
                              borderColor: "rgba(0,0,0,0.92)",
                              borderRadius: dotIndex % 2 === 0 ? "56% 44% 52% 48% / 48% 56% 44% 52%" : "49% 51% 45% 55% / 53% 47% 57% 43%",
                              transform: dotIndex % 2 === 0 ? "rotate(-6deg) scale(1.02)" : "rotate(7deg) scale(0.98)",
                            }}
                          />
                          {dotIndex === index ? (
                            <span
                              aria-hidden
                              className="absolute inset-[0.15rem] rounded-full bg-[#db0042]"
                              style={{
                                borderRadius: dotIndex % 2 === 0 ? "58% 42% 47% 53% / 46% 55% 45% 54%" : "52% 48% 56% 44% / 49% 53% 47% 51%",
                                transform: dotIndex % 2 === 0 ? "rotate(8deg)" : "rotate(-7deg)",
                              }}
                            />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <motion.article
      custom={direction}
      initial={
        reduced
          ? { opacity: 0 }
          : isMobile
            ? { opacity: 1, x: 0, scale: 1 }
            : { opacity: 0, x: direction * 60, scale: 0.985 }
      }
      animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
      exit={
        reduced
          ? { opacity: 0 }
          : isMobile
            ? { opacity: 1, x: 0, scale: 1 }
            : { opacity: 0, x: direction * -42, scale: 1.01 }
      }
      transition={{ duration: reduced ? 0.18 : 0.82, ease: [0.22, 1, 0.36, 1] }}
      className="grid h-[100dvh] w-full grid-cols-1 overflow-hidden px-0 pb-0 pt-16 sm:pt-20 lg:grid-cols-[minmax(340px,0.72fr)_minmax(0,1.28fr)] lg:gap-0 lg:px-0 lg:py-0 lg:pl-[3rem] lg:pr-0 xl:pl-[3rem] xl:pr-0"
    >
      <SceneContent
        slide={slide}
        index={index}
        direction={direction}
        total={total}
        onGoTo={onGoTo}
        onGoNext={onGoNext}
        onGoPrev={onGoPrev}
        onReplay={() => {
          if (reduced) return;
          setReplayNonce((current) => current + 1);
          setIsVideoReady(true);
          setPhase("play");
        }}
        canGoNext={canGoNext}
        canGoPrev={canGoPrev}
        canNavigate={canNavigate}
        phase={reduced ? "ended" : phase}
        reduced={reduced}
        isVideoReady={isVideoReady}
        replayNonce={replayNonce}
        showDesktopVideo={showDesktopVideo}
        onVideoReady={() => setIsVideoReady(true)}
        onVideoEnded={() => setPhase("ended")}
      />
    </motion.article>
  );
}

export function SelfishMoralityExperience() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartRef = useRef<number | null>(null);
  const touchMovedRef = useRef(false);
  const touchLastDeltaRef = useRef(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activePhase, setActivePhase] = useState<ScenePhase>("intro");
  const [isMobile, setIsMobile] = useState(false);
  const [isShortViewport, setIsShortViewport] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const slide = slides[index];
  const canGoPrev = index > 0;
  const canGoNext = index < slides.length - 1;
  const canNavigate = !isTransitioning;
  const progress = useMemo(
    () => `${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`,
    [index],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncViewport = () => {
      setIsMobile(window.innerWidth < 1024);
      setIsShortViewport(window.innerHeight < 520);
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slide");
    const foundIndex = slug ? slides.findIndex((candidate) => candidate.slug === slug) : -1;
    if (foundIndex >= 0) {
      setIndex(foundIndex);
    }

    const handlePopState = () => {
      const nextParams = new URLSearchParams(window.location.search);
      const nextSlug = nextParams.get("slide");
      const nextFoundIndex = nextSlug ? slides.findIndex((candidate) => candidate.slug === nextSlug) : -1;
      if (nextFoundIndex >= 0) {
        setDirection(nextFoundIndex > index ? 1 : -1);
        setIndex(nextFoundIndex);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [index]);

  const syncSlideUrl = useCallback((nextIndex: number) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("slide", slides[nextIndex].slug);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, []);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (!canNavigate || nextIndex === index || nextIndex < 0 || nextIndex >= slides.length) return;
      setDirection(nextIndex > index ? 1 : -1);
      setIsTransitioning(true);
      setIndex(nextIndex);
      syncSlideUrl(nextIndex);
    },
    [canNavigate, index, syncSlideUrl],
  );

  const goNext = useCallback(() => {
    if (!canNavigate) return;
    const nextIndex = canGoNext ? Math.min(index + 1, slides.length - 1) : 0;
    setDirection(1);
    setIsTransitioning(true);
    setIndex(nextIndex);
    syncSlideUrl(nextIndex);
  }, [canGoNext, canNavigate, index, syncSlideUrl]);

  const goPrev = useCallback(() => {
    if (!canNavigate || !canGoPrev) return;
    const nextIndex = Math.max(index - 1, 0);
    setDirection(-1);
    setIsTransitioning(true);
    setIndex(nextIndex);
    syncSlideUrl(nextIndex);
  }, [canGoPrev, canNavigate, index, syncSlideUrl]);

  useEffect(() => {
    if (!isTransitioning) return;

    const transitionTimer = window.setTimeout(() => setIsTransitioning(false), prefersReducedMotion ? 180 : SCENE_TRANSITION_MS);
    return () => window.clearTimeout(transitionTimer);
  }, [isTransitioning, prefersReducedMotion]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowRight", " ", "Enter", "PageDown"].includes(event.key)) {
        event.preventDefault();
        goNext();
      }
      if (["ArrowLeft", "Backspace", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  const handlePointerZone = (clientX: number) => {
    if (typeof window === "undefined") return;
    const midpoint = window.innerWidth / 2;
    if (clientX >= midpoint) {
      goNext();
    } else {
      goPrev();
    }
  };

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[var(--paper)] text-[var(--ink)] selection:bg-black/10">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={`${slide.id}-bg-paper`}
          className="pointer-events-none absolute inset-0"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{
            opacity: 1,
            background: [
              `radial-gradient(circle at top, rgba(255,255,255,0.96), rgba(245,238,227,0.9) 38%, rgba(234,225,212,0.74) 100%), linear-gradient(135deg, ${slide.palette.glow}, transparent 52%)`,
              `radial-gradient(circle at top, rgba(255,255,255,0.96), rgba(245,238,227,0.88) 38%, rgba(234,225,212,0.72) 100%), linear-gradient(135deg, ${slide.palette.glow}, transparent 60%)`,
            ],
          }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.18 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </AnimatePresence>
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-multiply [background-image:linear-gradient(to_bottom,rgba(92,69,54,.05),rgba(92,69,54,.03)),radial-gradient(circle_at_20%_20%,rgba(130,95,74,.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(95,58,52,.08),transparent_28%)]"
        initial={false}
        animate={{ opacity: 0.4 }}
        transition={{ duration: prefersReducedMotion ? 0.18 : 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="paper-noise pointer-events-none absolute inset-0 opacity-40"
        initial={false}
        animate={{ opacity: 0.4 }}
        transition={{ duration: prefersReducedMotion ? 0.18 : 0.9, ease: [0.22, 1, 0.36, 1] }}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-start justify-between px-5 py-4 sm:px-8 sm:py-5 lg:px-12">
        <div>
          <p className="relative -top-[2px] text-[18px] font-bold tracking-[0.02em] sm:text-[20px]" style={{ color: "#000000" }}>
            Selfish Morality
          </p>
          <p className="pointer-events-auto mt-[2px] text-[14px] text-[var(--muted)] sm:text-[16px]">
            A{" "}
            <a
              href="https://x.com/naval/status/1524651911344889856"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-black/20 underline-offset-2 transition hover:text-[var(--ink)] hover:decoration-black/40"
            >
              twitter thread
            </a>{" "}
            published by @naval.
          </p>
        </div>
      </header>

      <div className="pointer-events-auto absolute bottom-4 left-5 z-50 sm:bottom-5 sm:left-8 lg:bottom-6 lg:left-12">
        <a
          href="https://b-average.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-none bg-white pl-1.5 pr-[5px] py-1 text-[11px] font-semibold uppercase tracking-[2.16px] text-black no-underline transition hover:bg-black hover:text-white"
        >
          B AVERAGE
        </a>
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-45"
        initial={false}
        animate={prefersReducedMotion ? { opacity: 0 } : isTransitioning ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: prefersReducedMotion ? 0.18 : 0.46, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background:
            "linear-gradient(180deg, rgba(246,239,229,0.14), rgba(246,239,229,0.04) 26%, rgba(23,17,14,0.16) 100%)",
        }}
      />

      <button
        type="button"
        className="absolute inset-y-0 left-0 z-0 hidden w-1/2 cursor-w-resize md:block disabled:cursor-default"
        aria-label="Previous slide"
        onClick={(event) => handlePointerZone(event.clientX)}
        disabled={!canGoPrev || !canNavigate}
        aria-disabled={!canGoPrev || !canNavigate}
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 z-0 hidden w-1/2 cursor-e-resize md:block disabled:cursor-default"
        aria-label="Next slide"
        onClick={(event) => handlePointerZone(event.clientX)}
        disabled={!canGoNext || !canNavigate}
        aria-disabled={!canGoNext || !canNavigate}
      />

      <section
        className={`relative z-10 flex h-full items-stretch pt-[30px] sm:pt-3 lg:pt-0 ${isMobile && isShortViewport ? "overflow-y-auto" : ""}`}
        onTouchStart={(event) => {
          touchStartRef.current = event.touches[0]?.clientX ?? null;
          touchMovedRef.current = false;
          touchLastDeltaRef.current = 0;
        }}
        onTouchMove={(event) => {
          const current = event.touches[0]?.clientX;
          if (touchStartRef.current !== null && current !== undefined) {
            const delta = current - touchStartRef.current;
            touchLastDeltaRef.current = delta;
            if (Math.abs(delta) > 8) touchMovedRef.current = true;
          }
        }}
        onTouchEnd={() => {
          if (touchStartRef.current !== null) {
            const endDelta = touchMovedRef.current ? touchLastDeltaRef.current : 0;
            if (endDelta <= -swipeThreshold) goNext();
            if (endDelta >= swipeThreshold) goPrev();
          }
          touchStartRef.current = null;
          touchMovedRef.current = false;
          touchLastDeltaRef.current = 0;
        }}
      >
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <SceneStage
            key={slide.id}
            slide={slide}
            index={index}
            direction={direction}
            total={slides.length}
            onGoTo={goTo}
            onGoNext={goNext}
            onGoPrev={goPrev}
            canGoNext={canGoNext}
            canGoPrev={canGoPrev}
            canNavigate={canNavigate}
            reduced={Boolean(prefersReducedMotion)}
            onPhaseChange={setActivePhase}
            isMobile={isMobile}
            isShortViewport={isShortViewport}
          />
        </AnimatePresence>
      </section>
    </main>
  );
}
