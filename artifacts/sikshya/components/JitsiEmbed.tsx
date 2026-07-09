import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  roomName: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
}

export default function JitsiEmbed({ roomName, displayName, style }: Props) {
  const url = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&userInfo.displayName=${encodeURIComponent(displayName)}`;

  return (
    <WebView
      source={{ uri: url }}
      style={style}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      onPermissionRequest={(e: any) => e.nativeEvent.request.grant(e.nativeEvent.resources)}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
    />
  );
}
