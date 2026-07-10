import { useEffect, useState } from "react";
import { Platform } from "react-native";

export type MediaPermissionState = "idle" | "requesting" | "granted" | "denied";

/**
 * Proactively requests microphone + camera access as soon as a classroom is joined,
 * using the native browser getUserMedia API (no extra libraries). This forces the
 * browser permission prompt to appear immediately instead of silently failing inside
 * the embedded Daily.co call. The stream is stopped right away so the camera/mic are
 * free for the Daily.co embed to use.
 */
export function useMediaPermissions(): MediaPermissionState {
  const [state, setState] = useState<MediaPermissionState>("idle");

  useEffect(() => {
    let cancelled = false;

    if (Platform.OS !== "web" || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("granted");
      return;
    }

    setState("requesting");
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        if (!cancelled) setState("granted");
      })
      .catch(() => {
        if (!cancelled) setState("denied");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
