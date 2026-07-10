import React, { useMemo, useRef } from "react";
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

// A minimal HTML shell that loads the Daily.co prebuilt call via daily-js and bridges the
// `participant-left` event back to React Native via postMessage — no native SDK/module
// needed, keeping this lightweight (plain WebView, same footprint as the old Jitsi embed).
function buildEmbedHtml(roomUrl: string, displayName: string): string {
  const safeRoomUrl = JSON.stringify(roomUrl);
  const safeDisplayName = JSON.stringify(displayName);
  return `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <style>
      html, body, #call { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
    </style>
  </head>
  <body>
    <div id="call"></div>
    <script src="https://unpkg.com/@daily-co/daily-js"></script>
    <script>
      function post(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
        }
      }
      try {
        var callFrame = window.DailyIframe.createFrame(document.getElementById('call'), {
          iframeStyle: { width: '100%', height: '100%', border: '0' },
          showLeaveButton: false,
          showFullscreenButton: false,
        });
        callFrame.on('participant-left', function (event) {
          post('participant-left', { userName: event && event.participant && event.participant.user_name });
        });
        callFrame.on('error', function (event) {
          post('error', { errorMsg: event && event.errorMsg });
        });
        callFrame.join({ url: ${safeRoomUrl}, userName: ${safeDisplayName} }).catch(function (err) {
          post('error', { errorMsg: String(err) });
        });
      } catch (err) {
        post('error', { errorMsg: String(err) });
      }
    </script>
  </body>
</html>`;
}

export default function DailyEmbed({ roomUrl, displayName, style, watchUserName, onWatchedParticipantLeft }: Props) {
  const html = useMemo(() => buildEmbedHtml(roomUrl, displayName), [roomUrl, displayName]);
  const watchRef = useRef({ watchUserName, onWatchedParticipantLeft });
  watchRef.current = { watchUserName, onWatchedParticipantLeft };

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "participant-left") {
        const { watchUserName: watched, onWatchedParticipantLeft: cb } = watchRef.current;
        if (watched && msg.payload?.userName === watched) cb?.();
      } else if (msg.type === "error") {
        console.error("Daily.co embed error", msg.payload?.errorMsg);
      }
    } catch {}
  };

  if (!roomUrl) return null;

  return (
    <WebView
      source={{ html }}
      style={style}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      onPermissionRequest={(e: any) => e.nativeEvent.request.grant(e.nativeEvent.resources)}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      onMessage={handleMessage}
    />
  );
}
