# Memory Index

- [Expo native-tabs nav pitfall](expo-native-tabs-nav.md) — NativeTabs only register tab triggers; non-tab pushed routes silently no-op on iOS.
- [AuthGuard async-redirect role-cast crash](authguard-role-cast-crash.md) — guard role-specific screens; a wrong-role user renders briefly before the effect redirects.
- [Expo tabs absolute bar overlaps full-screen screens](expo-tabs-overlap.md) — absolute-positioned tab bar covers classroom chat/input unless tabBarStyle display:none is set per screen.
- [WebView on Expo web](webview-expo-web.md) — react-native-webview renders nothing on Platform.OS==='web'; needs a graceful Platform.OS check fallback.
- [Jitsi embed persistent PiP pattern](jitsi-embed-pattern.md) — embed Jitsi via platform-split component (WebView native / iframe web), keep it always mounted to avoid reconnect-on-tab-switch.
- [Expo mobile artifact web publish](expo-mobile-web-publish.md) — default mobile-kind build/serve targets Expo Go landing page, not a browser site; swap to `expo export -p web` + static serve for a real testable link.
