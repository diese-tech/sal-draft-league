"use client";

import { useEffect, useRef, useState } from "react";

interface HeroVideoLoopProps {
  clips: string[];
  poster?: string;
  className?: string;
}

export function HeroVideoLoop({ clips, poster, className }: HeroVideoLoopProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeSlot, setActiveSlot] = useState<"a" | "b">("a");
  const [indexA, setIndexA] = useState(0);
  const [indexB, setIndexB] = useState(1 % Math.max(clips.length, 1));

  const videoA = useRef<HTMLVideoElement>(null);
  const videoB = useRef<HTMLVideoElement>(null);

  // Detect reduced-motion preference on mount
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Load + play the active slot whenever its index or active slot changes
  useEffect(() => {
    if (reducedMotion || clips.length === 0) return;
    const activeVideo = activeSlot === "a" ? videoA.current : videoB.current;
    if (!activeVideo) return;
    const src = clips[activeSlot === "a" ? indexA : indexB];
    if (activeVideo.src !== src) {
      activeVideo.src = src;
      activeVideo.load();
    }
    activeVideo.play().catch(() => {
      // Autoplay blocked — poster stays visible until user interaction
    });
  }, [activeSlot, indexA, indexB, clips, reducedMotion]);

  // Preload the next clip when near the end of the current clip
  function handleTimeUpdate(slot: "a" | "b") {
    if (slot !== activeSlot) return;
    const video = slot === "a" ? videoA.current : videoB.current;
    const nextVideo = slot === "a" ? videoB.current : videoA.current;
    if (!video || !nextVideo) return;

    const remaining = video.duration - video.currentTime;
    if (remaining < 2 && remaining > 0) {
      const nextIndex = ((slot === "a" ? indexA : indexB) + 1) % clips.length;
      const nextSrc = clips[nextIndex];
      if (nextVideo.src !== nextSrc) {
        nextVideo.src = nextSrc;
        nextVideo.load();
      }
    }
  }

  // On clip end: advance index for the slot that just finished, flip active slot
  function handleEnded(slot: "a" | "b") {
    if (slot !== activeSlot) return;
    const currentIndex = slot === "a" ? indexA : indexB;
    const nextIndex = (currentIndex + 1) % clips.length;
    if (slot === "a") setIndexA(nextIndex);
    else setIndexB(nextIndex);
    setActiveSlot(slot === "a" ? "b" : "a");
  }

  if (clips.length === 0) return null;

  // Reduced-motion: static poster only
  if (reducedMotion) {
    return <img src={poster} className={className} alt="" />;
  }

  const crossfadeDuration = "700ms";

  return (
    <div className="relative h-full w-full">
      {/* Slot A */}
      <video
        ref={videoA}
        muted
        playsInline
        poster={poster}
        onTimeUpdate={() => handleTimeUpdate("a")}
        onEnded={() => handleEnded("a")}
        className={`${className} absolute inset-0`}
        style={{
          opacity: activeSlot === "a" ? 1 : 0,
          transition: `opacity ${crossfadeDuration} ease-in-out`,
        }}
      />
      {/* Slot B */}
      <video
        ref={videoB}
        muted
        playsInline
        onTimeUpdate={() => handleTimeUpdate("b")}
        onEnded={() => handleEnded("b")}
        className={`${className} absolute inset-0`}
        style={{
          opacity: activeSlot === "b" ? 1 : 0,
          transition: `opacity ${crossfadeDuration} ease-in-out`,
        }}
      />
    </div>
  );
}
