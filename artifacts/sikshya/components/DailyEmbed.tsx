import React, { useCallback, useRef } from "react";
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
// load to relay the `participant-left` event back to React Native via postMessage.
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

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "participant-left") {
        const { watchUserName: watched, onWatchedParticipantLeft: cb } = watchRef.current;
        if (watched && msg.payload?.userName === watched) cb?.();
      } else if (msg.type === "error") {
        console.error("Daily.co embed error", msg.payload?.errorMsg);
      }
    } catch {}
  }, []);

  if (!roomUrl) return null;

  const url = new URL(roomUrl);
  url.searchParams.set("userName", displayName);

  return (
    <WebView
      source={{ uri: url.toString() }}
      style={style}
      injectedJavaScript={INJECTED_BRIDGE_JS}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      // Android-only: auto-grants camera/mic capture requests instead of prompting.
      mediaCapturePermissionGrantType="grant"
      onPermissionRequest={(e: any) => e.nativeEvent.request.grant(e.nativeEvent.resources)}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      allowsProtectedMedia
      onMessage={handleMessage}
    />
  );
}
