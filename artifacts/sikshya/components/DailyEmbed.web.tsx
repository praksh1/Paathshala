import React, { useEffect, useRef, useState } from "react";

interface Props {
  roomUrl: string;
  displayName: string;
  /** Called the instant the local user exits the Daily call. */
  onLeft?: () => void;
  /** Fires `onWatchedParticipantLeft` when a remote participant with this display name leaves. */
  watchUserName?: string;
  onWatchedParticipantLeft?: () => void;
  /** Unused on web — accepted so the parent can pass StyleSheet.absoluteFill without a TS error. */
  style?: unknown;
}

// Paathshala dark theme — applied at createFrame() time so it's baked into the
// initial Prebuilt render instead of being patched in afterwards.
const DAILY_THEME = {
  colors: {
    accent: "#E11D48",
    accentText: "#FFFFFF",
    background: "#111111",
    backgroundAccent: "#1A1A1A",
    baseText: "#FFFFFF",
    border: "transparent",
    mainAreaBg: "#111111",
    mainAreaBgAccent: "#111111",
    mainAreaText: "#FFFFFF",
    supportiveText: "#AAAAAA",
  },
};

export default function DailyEmbed({
  roomUrl,
  displayName,
  onLeft,
  watchUserName,
  onWatchedParticipantLeft,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Keep callbacks in a stable ref so event listeners never become stale.
  const cbRef = useRef({ onLeft, watchUserName, onWatchedParticipantLeft });
  cbRef.current = { onLeft, watchUserName, onWatchedParticipantLeft };

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    let destroyed = false;
    let callFrame: any = null;

    // Dynamic import keeps @daily-co/daily-js OUT of the render-phase module
    // graph entirely.  Any webpack/bundler incompatibility that would previously
    // crash the classroom screen during its initial render now stays inside this
    // async effect and surfaces as a caught error instead.
    (async () => {
      try {
        const { default: DailyIframe } = await import("@daily-co/daily-js");

        if (destroyed || !containerRef.current) return;

        callFrame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
          showFullscreenButton: true,
          theme: DAILY_THEME as any,
        });

        // Permissions policy — required on iOS Safari to unblock getUserMedia
        // inside the cross-origin Daily iframe.
        const iframe = callFrame.iframe?.();
        if (iframe) {
          iframe.allow = "camera; microphone; autoplay; display-capture";
          iframe.style.border = "none";
          iframe.style.outline = "none";
        }

        callFrame.on("participant-left", (event: any) => {
          const leftName = event?.participant?.user_name;
          const { watchUserName: watched, onWatchedParticipantLeft: cb } = cbRef.current;
          if (watched && leftName === watched) cb?.();
        });

        callFrame.on("left-meeting", () => {
          cbRef.current.onLeft?.();
        });

        await callFrame.join({ url: roomUrl, userName: displayName });
      } catch (err: unknown) {
        if (!destroyed) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[DailyEmbed] failed:", msg);
          setJoinError(msg);
        }
      }
    })();

    return () => {
      destroyed = true;
      try { callFrame?.destroy(); } catch {}
    };
  }, [roomUrl, displayName]);

  if (joinError) {
    return React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#111",
          color: "#fff",
          fontFamily: "sans-serif",
          padding: "24px",
          gap: "12px",
          textAlign: "center",
        },
      },
      React.createElement("span", { style: { fontSize: "32px" } }, "📡"),
      React.createElement(
        "p",
        { style: { fontSize: "14px", color: "#ccc", maxWidth: "320px" } },
        "Unable to initialize video room. Please check your internet connection or video provider settings."
      ),
      React.createElement(
        "p",
        { style: { fontSize: "11px", color: "#555", maxWidth: "320px", wordBreak: "break-all" } },
        joinError
      )
    );
  }

  return React.createElement("div", {
    ref: containerRef,
    style: {
      position: "absolute",
      inset: 0,
      backgroundColor: "#111111",
      overflow: "hidden",
    },
  });
}
