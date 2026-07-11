import React from "react";
import { StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Web: render the PDF in a native browser <iframe>.
 * The browser's built-in PDF plugin handles rendering — no pdf.js canvas allocation,
 * no off-screen bitmap, no main-thread rasterization.
 * The `uri` may be either a `data:application/pdf;base64,…` string or an `https://` URL.
 */
export default function PdfViewer({ uri, style }: Props) {
  const flat = (StyleSheet.flatten(style) as Record<string, unknown>) ?? {};

  return (
    <View style={[styles.container, style]}>
      {React.createElement("iframe", {
        src: uri,
        title: "PDF document",
        style: {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: (flat.borderRadius as number | undefined) ?? 0,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
