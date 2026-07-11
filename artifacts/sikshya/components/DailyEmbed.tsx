import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  roomUrl: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
  watchUserName?: string;
  onWatchedParticipantLeft?: () => void;
}

// Small bridge script: relay participant-left events back to React Native so the
// student view can detect when the teacher drops. No camera/permission logic here —
// Daily Prebuilt handles its own permission UI natively inside the WebView.
const BRIDGE_JS = `
(function () {
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
  watchUserName,
  onWatchedParticipantLeft,
}: Props) {
  const watchRef = useRef({ watchUserName, onWatchedParticipantLeft });
  watchRef.current = { watchUserName, onWatchedParticipantLeft };

  if (!roomUrl) return null;

  const url = new URL(roomUrl);
  url.searchParams.set("userName", displayName);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "participant-left") {
        const { watchUserName: watched, onWatchedParticipantLeft: cb } = watchRef.current;
        if (watched && msg.payload?.userName === watched) cb?.();
      }
    } catch {}
  };

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
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
});
