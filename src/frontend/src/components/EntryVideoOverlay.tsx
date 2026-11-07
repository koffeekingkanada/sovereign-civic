import { useCallback, useEffect, useRef, useState } from "react";

/** The supplied vault entry clip, served from the frontend public directory. */
export const ENTRY_VIDEO_SRC = "/assets/video/vault-entry.mp4";

/** sessionStorage key: the entry video plays at most once per browser session. */
export const ENTRY_VIDEO_SESSION_KEY = "scs.entryVideoPlayed";

/** Duration of the white fade into the Directory, in milliseconds. */
const FADE_DURATION_MS = 600;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * True when the entry video has already played in this browser session, or when
 * the user prefers reduced motion. Read once per mount so a re-render or a later
 * navigation within the same session never replays the clip.
 */
export function shouldSkipEntryVideo(): boolean {
  if (prefersReducedMotion()) return true;
  if (typeof window === "undefined" || !window.sessionStorage) return false;
  try {
    return window.sessionStorage.getItem(ENTRY_VIDEO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markEntryVideoPlayed(): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(ENTRY_VIDEO_SESSION_KEY, "1");
  } catch {
    // A blocked storage API must not stop the Directory from rendering.
  }
}

interface EntryVideoOverlayProps {
  /** Called once the clip ends, is skipped, or fails to load. */
  onDone: () => void;
}

/**
 * Full-screen, muted vault entry clip shown once after a successful sign-in.
 * Tapping or clicking anywhere skips it; when it ends or is skipped the overlay
 * fades from white into the Directory. A load or playback error dismisses the
 * overlay immediately so the Directory is never blocked.
 */
export function EntryVideoOverlay({ onDone }: EntryVideoOverlayProps) {
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);
  const fadeTimerRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retriedRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    markEntryVideoPlayed();
    setFading(true);
    fadeTimerRef.current = window.setTimeout(() => {
      fadeTimerRef.current = null;
      onDone();
    }, FADE_DURATION_MS);
  }, [onDone]);

  // Start playback explicitly when the overlay appears rather than relying on
  // the autoplay attribute alone. If the first attempt is rejected, retry once
  // before falling back to the Directory.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const attemptPlay = () => {
      const result = video.play();
      if (result === undefined) return;
      result.catch(() => {
        if (cancelled || doneRef.current) return;
        if (!retriedRef.current) {
          retriedRef.current = true;
          attemptPlay();
          return;
        }
        finish();
      });
    };

    attemptPlay();

    return () => {
      cancelled = true;
    };
  }, [finish]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    };
  }, []);

  return (
    <button
      type="button"
      data-ocid="entry_video.overlay"
      aria-label="Skip the introduction video"
      onClick={finish}
      className="entry-video-overlay fixed inset-0 z-50 block cursor-pointer overflow-hidden border-0 bg-white p-0 text-left outline-none transition-opacity ease-out"
      style={{
        opacity: fading ? 0 : 1,
        transitionDuration: `${FADE_DURATION_MS}ms`,
      }}
    >
      <video
        ref={videoRef}
        data-ocid="entry_video.video"
        src={ENTRY_VIDEO_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="h-full w-full object-cover"
      />
    </button>
  );
}
