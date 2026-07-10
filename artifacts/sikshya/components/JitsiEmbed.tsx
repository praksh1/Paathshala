import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  roomName: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
}

const JITSI_DOMAIN = "meet.ffmuc.net";

const TOOLBAR_BUTTONS = ["microphone", "camera", "desktop", "fullscreen", "hangup", "profile", "settings", "videoquality"];

export default function JitsiEmbed({ roomName, displayName, style }: Props) {
  const safeRoomName = "ClassSession" + roomName.replace(/[^a-zA-Z0-9]/g, "");
  const configParams = [
    "config.prejoinPageEnabled=false",
    "config.startWithAudioMuted=false",
    "config.startWithVideoMuted=false",
    "config.disableDeepLinking=true",
    `config.toolbarButtons=${encodeURIComponent(JSON.stringify(TOOLBAR_BUTTONS))}`,
    "config.toolbarConfig.alwaysVisible=true",
    "interfaceConfig.TOOLBAR_BUTTONS=" + encodeURIComponent(JSON.stringify(TOOLBAR_BUTTONS)),
    "config.disableChat=true",
    "config.chat.enabled=false",
    "config.etherpad.enabled=false",
    `userInfo.displayName=${encodeURIComponent(displayName)}`,
  ];
  const url = `https://${JITSI_DOMAIN}/${safeRoomName}#${configParams.join("&")}`;

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
