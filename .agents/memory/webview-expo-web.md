---
name: WebView on Expo web
description: react-native-webview doesn't render on Expo web (Platform.OS==='web'); needs a Platform check and fallback UI.
---

`react-native-webview` only works on iOS and Android. On Expo web it renders a "does not support this platform" error message that looks broken to users.

**Why:** react-native-webview is a native module with no web implementation.

**How to apply:** Always wrap WebView usage with a Platform.OS check:
```tsx
{Platform.OS === "web" ? (
  <View style={styles.callWeb}>
    <Text>This feature is available on the mobile app.</Text>
  </View>
) : (
  <WebView source={{ uri: url }} ... />
)}
```
This applies to any feature using WebView for native content (Jitsi calls, embedded browser flows, etc.).
