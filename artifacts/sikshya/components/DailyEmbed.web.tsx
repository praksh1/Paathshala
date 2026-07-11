import DailyIframe from "@daily-co/daily-js";
import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface Props {
  roomUrl: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
  /** Called the instant the local user exits the Daily call (native Leave button or otherwise). */
  onLeft?: () => void;
  /** If set, fires `onWatchedParticipantLeft` when a remote participant with this
   * display name leaves the call — used to notify students if the teacher drops. */
  watchUserName?: string;
  onWatchedParticipantLeft?: () => void;
}

// Paathshala dark theme passed directly into Daily Prebuilt at frame-creation time.
// Using the `as any` escape hatch keeps us resilient to Daily SDK type-version drift
// while still applying every documented DailyThemeColors key at runtime.
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
} as any;

export default function DailyEmbed({
  roomUrl,
  displayName,
  style,
  onLeft,
  watchUserName,
  onWatchedParticipantLeft,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callFrameRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);

  // Stable ref so event callbacks always see the latest prop values without
  // being captured in stale closures — adding them to the useEffect deps array
  // would cause the frame to be destroyed and recreated on every prop change.
  const cbRef = useRef({ onLeft, watchUserName, onWatchedParticipantLeft });
  cbRef.current = { onLeft, watchUserName, onWatchedParticipantLeft };

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { width: "100%", height: "100%", border: "0" },
      // Show the native Daily Leave button so clicking it fires 'left-meeting'
      // and we can sync the app's state with a single event — no double-press.
      showLeaveButton: true,
      showFullscreenButton: true,
      theme: DAILY_THEME,
    });

    // Explicitly set iframe permissions + strip any residual border/outline so
    // the Daily UI sits flush with the surrounding dark layout.
    const iframe = callFrame.iframe();
    if (iframe) {
      iframe.allow = "camera; microphone; autoplay; display-capture";
      iframe.style.border = "none";
      iframe.style.outline = "none";
    }

    callFrameRef.current = callFrame;

    // Teacher-disconnect detection for student view.
    callFrame.on("participant-left", (event: any) => {
      const leftName = event?.participant?.user_name;
      const { watchUserName: watched, onWatchedParticipantLeft: cb } = cbRef.current;
      if (watched && leftName === watched) cb?.();
    });

    // 'left-meeting' fires the instant the local user exits the call — whether they
    // clicked Daily's native red Leave button or the call ended for another reason.
    // This is the single source of truth for lifecycle sync: no more double-press.
    callFrame.on("left-meeting", () => {
      cbRef.current.onLeft?.();
    });

    callFrame
      .join({ url: roomUrl, userName: displayName })
      .catch((err: unknown) => {
        console.error("[DailyEmbed] join failed", err);
      });

    return () => {
      callFrame.destroy();
      callFrameRef.current = null;
    };
  }, [roomUrl, displayName]);

  const flat = (StyleSheet.flatten(style) as Record<string, unknown>) ?? {};

  return React.createElement("div", {
    ref: containerRef,
    style: {
      width: "100%",
      height: "100%",
      border: "none",
      outline: "none",
      position: "relative",
      overflow: "hidden",
      backgroundColor: "#111111",
      ...flat,
    },
  });
}
