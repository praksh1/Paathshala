import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface Props {
  roomName: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
}

const JITSI_DOMAIN = "meet.ffmuc.net";
const JITSI_SCRIPT_SRC = `https://${JITSI_DOMAIN}/external_api.js`;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadJitsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${JITSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Jitsi external API script")));
      return;
    }
    const script = document.createElement("script");
    script.src = JITSI_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Jitsi external API script"));
    document.body.appendChild(script);
  });

  return scriptLoadPromise;
}

export default function JitsiEmbed({ roomName, displayName, style }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const safeRoomName = "ClassSession" + roomName.replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    let cancelled = false;

    if (!safeRoomName) return;

    loadJitsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.JitsiMeetExternalAPI || !safeRoomName) return;

        apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: safeRoomName,
          parentNode: containerRef.current,
          userInfo: { displayName },
          configOverwrite: {
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {},
        });
      })
      .catch((err) => {
        console.error("Jitsi failed to load", err);
      });

    return () => {
      cancelled = true;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [safeRoomName, displayName]);

  const flat = (StyleSheet.flatten(style) as Record<string, unknown>) ?? {};

  return React.createElement("div", {
    ref: containerRef,
    style: { border: "none", width: "100%", height: "100%", ...flat },
  });
}
