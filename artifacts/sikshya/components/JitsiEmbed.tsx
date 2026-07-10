import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  roomName: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
}

const JITSI_DOMAIN = "meet.ffmuc.net";

// Explicit allow-list — chat, etherpad, sharedvideo, and whiteboard are strictly excluded
// so users are forced to use our custom in-app tools instead of Jitsi's native ones.
const TOOLBAR_BUTTONS = ["microphone", "camera", "desktop", "fullscreen", "hangup", "profile", "settings"];

export default function JitsiEmbed({ roomName, displayName, style }: Props) {
  const safeRoomName = "ClassSession" + roomName.replace(/[^a-zA-Z0-9]/g, "");
  const configParams = [
    "config.prejoinPageEnabled=false",
    "config.startWithAudioMuted=false",
    "config.startWithVideoMuted=false",
    "config.disableDeepLinking=true",
    "config.disablePictureInPicture=true",
    "config.defaultLanguage=en",
    `config.toolbarButtons=${encodeURIComponent(JSON.stringify(TOOLBAR_BUTTONS))}`,
    "config.toolbarConfig.alwaysVisible=true",
    "interfaceConfig.TOOLBAR_BUTTONS=" + encodeURIComponent(JSON.stringify(TOOLBAR_BUTTONS)),
    "interfaceConfig.filmStripOnly=false",
    "interfaceConfig.LANG_DETECTION=false",
    "config.disableChat=true",
    "config.chat.enabled=false",
    "config.etherpad.enabled=false",
    "config.disableSharedVideo=true",
    "config.whiteboard.enabled=false",
    `userInfo.displayName=${encodeURIComponent(displayName)}`,
  ];
  // `subject` is a top-level URL query param (not a hash config), and forces the
  // room title to "Live Class" instead of the German default set by the server.
  const url = `https://${JITSI_DOMAIN}/${safeRoomName}?subject=${encodeURIComponent("Live Class")}#${configParams.join("&")}`;

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
