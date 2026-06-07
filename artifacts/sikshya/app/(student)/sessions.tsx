import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { SESSIONS_KEY } from "@/context/AuthContext";
import SessionCard from "@/components/SessionCard";
import { useColors } from "@/hooks/useColors";
import type { Student } from "@/context/AuthContext";

interface Session {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  topic: string;
  date: string;
  duration: number;
  maxStudents: number;
  enrolledStudents: string[];
  price: number;
  status: "upcoming" | "live" | "completed" | "cancelled";
}

export default function StudentSessions() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const student = user as Student;
  const [sessions, setSessions] = useState<Session[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    const stored = await AsyncStorage.getItem(SESSIONS_KEY);
    const all: Session[] = stored ? JSON.parse(stored) : [];
    const mySessions = all.filter(
      (s) => s.enrolledStudents.includes(student?.id ?? "") || s.status === "live"
    );
    setSessions(mySessions);
  };

  const joinSession = (session: Session) => {
    if (session.status !== "live") {
      Alert.alert("Session Not Started", "This session hasn't started yet. Please join at the scheduled time.");
      return;
    }
    Alert.alert("Join Session", `Join "${session.topic}" by ${session.teacherName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Pay & Join",
        onPress: () => Alert.alert("Payment", `NPR ${session.price.toLocaleString()} will be charged via eSewa/Khalti. Continue?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Proceed", onPress: () => Alert.alert("Joined!", "You have joined the session.") },
        ]),
      },
    ]);
  };

  const liveSessions = sessions.filter((s) => s.status === "live");
  const upcomingSessions = sessions.filter((s) => s.status === "upcoming");
  const pastSessions = sessions.filter((s) => s.status === "completed" || s.status === "cancelled");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Sessions</Text>
      </View>

      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        scrollEnabled={!!sessions.length}
        ListHeaderComponent={
          <View>
            {liveSessions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.liveIndicator, { backgroundColor: colors.success }]} />
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Live Now</Text>
                </View>
                {liveSessions.map((s) => (
                  <TouchableOpacity key={s.id} onPress={() => joinSession(s)} activeOpacity={0.85}>
                    <SessionCard session={s} showTeacher />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {upcomingSessions.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming</Text>
                {upcomingSessions.map((s) => (
                  <SessionCard key={s.id} session={s} showTeacher onPress={() => joinSession(s)} />
                ))}
              </View>
            )}

            {pastSessions.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Past Sessions</Text>
                {pastSessions.map((s) => (
                  <SessionCard key={s.id} session={s} showTeacher />
                ))}
              </View>
            )}
          </View>
        }
        renderItem={() => null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="calendar" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No sessions yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Browse teachers and book your first session
            </Text>
            <TouchableOpacity
              style={[styles.discoverBtn, { backgroundColor: colors.secondary }]}
              onPress={() => router.push("/(student)/")}
              activeOpacity={0.85}
            >
              <Text style={styles.discoverBtnText}>Find a Teacher</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  section: { gap: 4, marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  liveIndicator: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  discoverBtn: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  discoverBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
