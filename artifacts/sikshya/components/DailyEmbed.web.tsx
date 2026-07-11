import DailyIframe from "@daily-co/daily-js";
import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface Props {
  roomUrl: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
  watchUserName?: string;
  onWatchedParticipantLeft?: () => void;
}

export default function DailyEmbed({
  roomUrl,
  displayName,
  style,
  watchUserName,
  onWatchedParticipantLeft,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callFrameRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);

  const watchRef = useRef({ watchUserName, onWatchedParticipantLeft });
  watchRef.current = { watchUserName, onWatchedParticipantLeft };

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    const callFrame = DailyIframe.createFrame(containerRef.current, {
      iframeStyle: { width: "100%", height: "100%", border: "0" },
      showLeaveButton: false,
      showFullscreenButton: true,
    });

    // Explicitly set the allow attribute on the underlying iframe element so that
    // iOS Safari grants camera/mic/autoplay permissions without showing an infinite
    // permission-request loop — without this attribute the Permissions Policy blocks
    // getUserMedia inside the cross-origin Daily iframe entirely.
    const iframe = callFrame.iframe();
    if (iframe) {
      iframe.allow = "camera; microphone; autoplay; display-capture";
    }

    callFrameRef.current = callFrame;

    callFrame.on("participant-left", (event: any) => {
      const leftName = event?.participant?.user_name;
      const { watchUserName: watched, onWatchedParticipantLeft: cb } = watchRef.current;
      if (watched && leftName === watched) cb?.();
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
      position: "relative",
      overflow: "hidden",
      ...flat,
    },
  });
}
