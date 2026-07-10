import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { apiGet } from "@/utils/api";

interface Conversation {
  otherUserId: number;
  otherUserName: string;
  otherUserRole: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export default function ConversationList({ title }: { title: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<Conversation[]>("/conversations");
      setConversations(data);
    } catch (_e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 6000);
    return () => clearInterval(interval);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>

      {!loading && conversations.length === 0 && (
        <View style={[styles.empty, { backgroundColor: colors.muted }]}>
          <Feather name="message-circle" size={26} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No conversations yet. Messages you send or receive will show up here.
          </Text>
        </View>
      )}

      {conversations.map((c) => (
        <TouchableOpacity
          key={c.otherUserId}
          style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() =>
            router.push({
              pathname: "/conversation/[id]",
              params: { id: String(c.otherUserId), name: c.otherUserName },
            })
          }
          testID={`conversation-row-${c.otherUserId}`}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary + "18" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials(c.otherUserName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.rowTop}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {c.otherUserName}
              </Text>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>
                {new Date(c.lastMessageAt).toLocaleDateString("en-NP", { month: "short", day: "numeric" })}
              </Text>
            </View>
            <Text style={[styles.preview, { color: colors.mutedForeground }]} numberOfLines={1}>
              {c.lastMessage}
            </Text>
          </View>
          {c.unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{c.unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  empty: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10, marginTop: 20 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  preview: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center", paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
});
