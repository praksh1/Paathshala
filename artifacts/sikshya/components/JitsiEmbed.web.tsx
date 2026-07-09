import React from "react";
import { StyleSheet } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface Props {
  roomName: string;
  displayName: string;
  style?: StyleProp<ViewStyle>;
}

export default function JitsiEmbed({ roomName, displayName, style }: Props) {
  const url = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.disableDeepLinking=true&userInfo.displayName=${encodeURIComponent(displayName)}`;

  const flat = (StyleSheet.flatten(style) as Record<string, unknown>) ?? {};

  return React.createElement("iframe", {
    src: url,
    style: { border: "none", width: "100%", height: "100%", ...flat },
    allow: "camera; microphone; fullscreen; display-capture; autoplay",
  } as any);
}
