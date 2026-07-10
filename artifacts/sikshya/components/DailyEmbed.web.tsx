import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface Props {
  roomUrl: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
  /** If set, fires `onWatchedParticipantLeft` when a remote participant with this
   * display name leaves the call — used to notify students if the teacher drops. */
  watchUserName?: string;
  onWatchedParticipantLeft?: () => void;
}

declare global {
  interface Window {
    DailyIframe?: any;
  }
}

const DAILY_SCRIPT_SRC = "https://unpkg.com/@daily-co/daily-js";

let scriptLoadPromise: Promise<void> | null = null;

function loadDailyScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.DailyIframe) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${DAILY_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Daily.co script")));
      return;
    }
    const script = document.createElement("script");
    script.src = DAILY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Daily.co script"));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export default function DailyEmbed({ roomUrl, displayName, style, watchUserName, onWatchedParticipantLeft }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callFrameRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (!roomUrl) return;

    loadDailyScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.DailyIframe) return;

        const callFrame = window.DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: "100%", height: "100%", border: "0" },
          showLeaveButton: false,
          showFullscreenButton: true,
        });
        callFrameRef.current = callFrame;

        callFrame.on("participant-left", (event: any) => {
          const leftName = event?.participant?.user_name;
          if (watchUserName && leftName === watchUserName) {
            onWatchedParticipantLeft?.();
          }
        });

        callFrame.join({ url: roomUrl, userName: displayName }).catch((err: unknown) => {
          console.error("Daily.co join failed", err);
        });
      })
      .catch((err) => {
        console.error("Daily.co failed to load", err);
      });

    return () => {
      cancelled = true;
      if (callFrameRef.current) {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [roomUrl, displayName, watchUserName, onWatchedParticipantLeft]);

  const flat = (StyleSheet.flatten(style) as Record<string, unknown>) ?? {};

  return React.createElement("div", {
    ref: containerRef,
    style: {
      border: "none",
      width: "100%",
      height: "100%",
      position: "relative",
      overflow: "hidden",
      contain: "layout style paint",
      isolation: "isolate",
      ...flat,
    },
  });
}
