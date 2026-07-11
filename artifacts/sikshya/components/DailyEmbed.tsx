import React, { useCallback, useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

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

// Injected once after the WebView loads. Responsibilities:
//   1. Apply Paathshala dark-theme CSS overrides to the Daily Prebuilt shell.
//   2. Poll for the Daily call instance and, once found, attach event listeners
//      that relay 'participant-left' and 'left-meeting' to React Native via postMessage.
//
// CSS variables targeting Daily Prebuilt's documented custom-property API are set on :root
// so they cascade into any sub-frames that Daily renders inside the Prebuilt page.
const BRIDGE_JS = `
(function () {
  var s = document.createElement('style');
  s.textContent = [
    ':root{',
    '  --daily-color-bg:#111111;',
    '  --daily-color-bg-mid:#1a1a1a;',
    '  --daily-color-accent:#E11D48;',
    '  --daily-color-accent-text:#ffffff;',
    '  --daily-color-base-text:#ffffff;',
    '  --daily-color-border:transparent;',
    '}',
    'body,#app,.DailyApp{background:#111111!important;}',
  ].join('');
  (document.head || document.documentElement).appendChild(s);

  function post(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    }
  }

  function attach() {
    try {
      var frame =
        (window.callFrame) ||
        (window.DailyIframe &&
          window.DailyIframe.getCallInstance &&
          window.DailyIframe.getCallInstance());
      if (frame && frame.on && !frame.__sikshyaBridged) {
        frame.__sikshyaBridged = true;

        frame.on('participant-left', function (event) {
          post('participant-left', {
            userName: event && event.participant && event.participant.user_name,
          });
        });

        // 'left-meeting' fires the instant the local user exits — whether they tapped
        // Daily's native red Leave button or the session ended. Relay it so the app
        // can clean up state and redirect in a single step, no double-press required.
        frame.on('left-meeting', function () {
          post('left-meeting', {});
        });

        return;
      }
    } catch (e) {}
    setTimeout(attach, 500);
  }
  attach();
  true;
})();
`;

export default function DailyEmbed({
  roomUrl,
  displayName,
  style,
  onLeft,
  watchUserName,
  onWatchedParticipantLeft,
}: Props) {
  // Stable ref: event callbacks always see current props without being stale closures,
  // and without triggering a WebView remount when props change.
  const cbRef = useRef({ onLeft, watchUserName, onWatchedParticipantLeft });
  cbRef.current = { onLeft, watchUserName, onWatchedParticipantLeft };

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "participant-left") {
        const { watchUserName: watched, onWatchedParticipantLeft: cb } = cbRef.current;
        if (watched && msg.payload?.userName === watched) cb?.();
      } else if (msg.type === "left-meeting") {
        cbRef.current.onLeft?.();
      }
    } catch {}
  }, []);

  if (!roomUrl) return null;

  const url = new URL(roomUrl);
  url.searchParams.set("userName", displayName);

  return (
    <View style={[style, styles.container]}>
      <WebView
        source={{ uri: url.toString() }}
        style={styles.webview}
        injectedJavaScript={BRIDGE_JS}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        allowsProtectedMedia
        onMessage={handleMessage}
        {...({
          onPermissionRequest: (e: any) =>
            e.nativeEvent.request.grant(e.nativeEvent.resources),
        } as any)}
      />
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
    backgroundColor: "#111111",
  },
  webview: {
    flex: 1,
    backgroundColor: "#111111",
  },
});
