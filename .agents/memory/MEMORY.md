# Memory Index

- [Expo native-tabs nav pitfall](expo-native-tabs-nav.md) — NativeTabs only register tab triggers; non-tab pushed routes silently no-op on iOS.
- [AuthGuard async-redirect role-cast crash](authguard-role-cast-crash.md) — guard role-specific screens; a wrong-role user renders briefly before the effect redirects.
- [Expo tabs absolute bar overlaps full-screen screens](expo-tabs-overlap.md) — absolute-positioned tab bar covers classroom chat/input unless tabBarStyle display:none is set per screen.
- [WebView on Expo web](webview-expo-web.md) — react-native-webview renders nothing on Platform.OS==='web'; needs a graceful Platform.OS check fallback.
- [Daily.co embed replacing Jitsi](daily-embed-pattern.md) — same platform-split component pattern as Jitsi (iframe web / WebView native), teacher-left detection via display-name matching since no server-issued Daily tokens yet.
- [Expo mobile artifact web publish](expo-mobile-web-publish.md) — default mobile-kind build/serve targets Expo Go landing page, not a browser site; swap to `expo export -p web` + static serve for a real testable link.
- [Lazy ghost-session expiry](lazy-ghost-session-expiry.md) — seed/bot "live" sessions never flip to completed on their own; expire stale ones on read instead of a cron job.
- [Free follow vs paid subscription](free-follow-vs-paid-subscription.md) — keep a teacher's own paid subscription tier separate from a student's free "follow" relationship; don't overload one table for both.
