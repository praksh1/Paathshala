import { useEffect, useState } from "react";
import { Platform } from "react-native";

export type MediaPermissionState = "idle" | "requesting" | "granted" | "denied";

/**
 * Proactively requests microphone + camera access before the Daily.co WebView is ever
 * mounted. On iOS, WKWebView will NOT surface its own getUserMedia permission prompt for
 * an embedded call reliably — the native app shell must have already been granted camera
 * and microphone permissions via the OS-level prompt, otherwise WebRTC inside the WebView
 * is silently blocked. We use expo-camera + expo-av to trigger those native prompts first,
 * and only report "granted" (unblocking the WebView render) once both succeed.
 *
 * On web, there's no native permission layer — we fall back to a direct getUserMedia probe
 * (same reasoning, but via the browser's own permission prompt).
 */
export function useMediaPermissions(): MediaPermissionState {
  const [state, setState] = useState<MediaPermissionState>("idle");

  useEffect(() => {
    let cancelled = false;

    async function requestWeb() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setState("granted");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        stream.getTracks().forEach((track) => track.stop());
        if (!cancelled) setState("granted");
      } catch {
        if (!cancelled) setState("denied");
      }
    }

    async function requestNative() {
      try {
        const [{ Camera }, { Audio }] = await Promise.all([import("expo-camera"), import("expo-av")]);
        const cameraResult = await Camera.requestCameraPermissionsAsync();
        const audioResult = await Audio.requestPermissionsAsync();
        if (cancelled) return;
        if (cameraResult.granted && audioResult.granted) {
          setState("granted");
        } else {
          setState("denied");
        }
      } catch {
        if (!cancelled) setState("denied");
      }
    }

    setState("requesting");
    if (Platform.OS === "web") {
      requestWeb();
    } else {
      requestNative();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
