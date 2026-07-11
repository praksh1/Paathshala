import React, { useEffect, useRef, useState } from "react";

interface Props {
  roomUrl: string;
  displayName: string;
  onLeft?: () => void;
  watchUserName?: string;
  onWatchedParticipantLeft?: () => void;
  /** Unused on web — accepted so parent can pass StyleSheet.absoluteFill without TS error. */
  style?: unknown;
}

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

/**
 * Module-level Daily frame singleton.
 * Daily.js only allows ONE frame per browser page.  Keeping the reference here
 * lets every mount/unmount cycle destroy the previous frame before creating a
 * new one — even if React unmounts and remounts the component faster than the
 * async cleanup has time to settle.
 */
let _activeFrame: any = null;

async function destroyActiveFrame() {
  if (_activeFrame) {
    try {
      await _activeFrame.destroy();
    } catch {
      // ignore — may have already been destroyed
    }
    _activeFrame = null;
  }
}

export default function DailyEmbed({
  roomUrl,
  displayName,
  onLeft,
  watchUserName,
  onWatchedParticipantLeft,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const cbRef = useRef({ onLeft, watchUserName, onWatchedParticipantLeft });
  cbRef.current = { onLeft, watchUserName, onWatchedParticipantLeft };

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const { default: DailyIframe } = await import("@daily-co/daily-js");

        // Always destroy any pre-existing frame before creating a new one.
        await destroyActiveFrame();

        if (cancelled || !containerRef.current) return;

        const callFrame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: true,
          showFullscreenButton: true,
          theme: DAILY_THEME as any,
        });

        _activeFrame = callFrame;

        const iframe = (callFrame as any).iframe?.();
        if (iframe) {
          iframe.allow = "camera; microphone; autoplay; display-capture";
          iframe.style.border = "none";
          iframe.style.outline = "none";
        }

        callFrame.on("participant-left", (event: any) => {
          const leftName = event?.participant?.user_name;
          const { watchUserName: watched, onWatchedParticipantLeft: cb } =
            cbRef.current;
          if (watched && leftName === watched) cb?.();
        });

        callFrame.on("left-meeting", () => {
          cbRef.current.onLeft?.();
        });

        await callFrame.join({ url: roomUrl, userName: displayName });
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[DailyEmbed] failed:", msg);
          setJoinError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
      destroyActiveFrame();
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
        {
          style: {
            fontSize: "11px",
            color: "#555",
            maxWidth: "320px",
            wordBreak: "break-all",
          },
        },
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
