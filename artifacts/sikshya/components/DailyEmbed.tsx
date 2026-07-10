import React, { useCallback, useRef } from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  roomUrl: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
  /** If set, fires `onWatchedParticipantLeft` when a remote participant with this
   * display name leaves the call — used to notify students if the teacher drops. */
  watchUserName?: string;
  onWatchedParticipantLeft?: () => void;
}

// iOS WKWebView disables WebRTC entirely when the page is loaded from an inline HTML
// string (source={{ html }}) because it has no real origin — camera/mic getUserMedia calls
// are silently blocked. Loading the Daily room by its real https:// URL (source={{ uri }})
// gives the page a proper origin so WebRTC works. We inject a small bridge script after
// load to relay the `participant-left` event back to React Native via postMessage, and to
// verify the call frame actually reports its camera as enabled (isCameraEnabled).
const INJECTED_BRIDGE_JS = `
(function () {
  function post(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    }
  }
  function attach() {
    try {
      var frame = (window.callFrame) ||
        (window.DailyIframe && window.DailyIframe.getCallInstance && window.DailyIframe.getCallInstance());
      if (frame && frame.on && !frame.__sikshyaBridged) {
        frame.__sikshyaBridged = true;
        frame.on('participant-left', function (event) {
          post('participant-left', { userName: event && event.participant && event.participant.user_name });
        });
        frame.on('error', function (event) {
          post('error', { errorMsg: event && event.errorMsg });
        });
        frame.on('camera-error', function (event) {
          post('camera-error', { errorMsg: event && event.errorMsg });
        });
        // Debug check: confirm the call frame actually thinks the camera is enabled.
        // If this logs false/undefined repeatedly, the browser never granted camera
        // access and the "Grant Permission" fallback button should be shown.
        setTimeout(function () {
          try {
            var enabled = frame.isCameraEnabled ? frame.isCameraEnabled() : (frame.participants && frame.participants().local && frame.participants().local.video);
            console.log('[DailyEmbed] isCameraEnabled check:', enabled);
            post('camera-check', { isCameraEnabled: !!enabled });
          } catch (e) {
            console.log('[DailyEmbed] isCameraEnabled check failed:', String(e));
            post('camera-check', { isCameraEnabled: false });
          }
        }, 3000);
        return;
      }
    } catch (err) {}
    setTimeout(attach, 500);
  }
  attach();
  true;
})();
`;

export default function DailyEmbed({ roomUrl, displayName, style, watchUserName, onWatchedParticipantLeft }: Props) {
  const watchRef = useRef({ watchUserName, onWatchedParticipantLeft });
  watchRef.current = { watchUserName, onWatchedParticipantLeft };
  const webviewRef = useRef<WebView>(null);
  const [cameraFailed, setCameraFailed] = React.useState(false);
  const [reloadKey, setReloadKey] = React.useState(0);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "participant-left") {
        const { watchUserName: watched, onWatchedParticipantLeft: cb } = watchRef.current;
        if (watched && msg.payload?.userName === watched) cb?.();
      } else if (msg.type === "error" || msg.type === "camera-error") {
        console.error("Daily.co embed error", msg.payload?.errorMsg);
        setCameraFailed(true);
      } else if (msg.type === "camera-check") {
        console.log("[DailyEmbed] isCameraEnabled reported by WebView:", msg.payload?.isCameraEnabled);
        if (!msg.payload?.isCameraEnabled) setCameraFailed(true);
      }
    } catch {}
  }, []);

  const handleGrantPermission = useCallback(() => {
    setCameraFailed(false);
    setReloadKey((k) => k + 1);
    webviewRef.current?.reload();
  }, []);

  if (!roomUrl) return null;

  const url = new URL(roomUrl);
  url.searchParams.set("userName", displayName);

  return (
    <View style={[style, styles.container]}>
      <WebView
        key={reloadKey}
        ref={webviewRef}
        source={{ uri: url.toString() }}
        style={styles.webview}
        injectedJavaScript={INJECTED_BRIDGE_JS}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        // Android-only: auto-grants camera/mic capture requests instead of prompting.
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        allowsProtectedMedia
        onMessage={handleMessage}
        {...({ onPermissionRequest: (e: any) => e.nativeEvent.request.grant(e.nativeEvent.resources) } as any)}
      />
      {cameraFailed && (
        <View style={styles.retryOverlay}>
          <Text style={styles.retryText}>Camera or microphone didn't start.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleGrantPermission} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1000,
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  retryOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1001,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#C41E3A",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
