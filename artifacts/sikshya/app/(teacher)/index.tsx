import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useNotifications } from "@/context/NotificationContext";
import { sendDemoNotification } from "@/utils/notifications";
import type { Teacher } from "@/context/AuthContext";

const UPCOMING_SESSIONS = [
  { id: "s1", subject: "Mathematics", topic: "Calculus: Derivatives", time: "Today, 4:00 PM", students: 12, max: 20 },
  { id: "s2", subject: "Mathematics", topic: "Integration Techniques", time: "Tomorrow, 3:30 PM", students: 8, max: 20 },
];

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { unreadCount, refresh: refreshNotifs } = useNotifications();
  const teacher = user as Teacher;

  useEffect(() => {
    refreshNotifs();
    sendDemoNotification();
  }, []);

  if (!teacher) return null;

  const isPending = teacher.approvalStatus === "pending";
  const isRejected = teacher.approvalStatus === "rejected";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Namaste,</Text>
          <Text style={[styles.name, { color: colors.foreground }]}>{teacher.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/notifications")}
            activeOpacity={0.7}
          >
            <Feather name="bell" size={18} color={colors.foreground} />
            {unreadCount > 0 && (
              <View style={[styles.bellBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.bellBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={logout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {isPending && (
        <View style={[styles.alertBanner, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "40" }]}>
          <Feather name="clock" size={18} color={colors.accent} />
          <View style={styles.alertText}>
            <Text style={[styles.alertTitle, { color: "#B45309" }]}>Verification Pending</Text>
            <Text style={[styles.alertBody, { color: "#92400E" }]}>
              Upload your credentials in Profile to get approved and start teaching.
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(teacher)/profile")} activeOpacity={0.7}>
            <Text style={[styles.alertAction, { color: colors.accent }]}>Upload</Text>
          </TouchableOpacity>
        </View>
      )}

      {isRejected && (
        <View style={[styles.alertBanner, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}>
          <Feather name="x-circle" size={18} color={colors.destructive} />
          <View style={styles.alertText}>
            <Text style={[styles.alertTitle, { color: colors.destructive }]}>Verification Rejected</Text>
            <Text style={[styles.alertBody, { color: colors.mutedForeground }]}>
              Please re-upload valid documents in your Profile.
            </Text>
          </View>
        </View>
      )}

      <LinearGradient
        colors={[colors.primary, "#8B0000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsCard}
      >
        <Text style={styles.statsTitle}>This Month</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{teacher.sessionsThisMonth}/10</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{teacher.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>NPR {(teacher.monthlyEarnings / 1000).toFixed(0)}k</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>
        <View style={[styles.planBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name="shield" size={13} color="#fff" />
          <Text style={styles.planBadgeText}>Pro Plan · NPR 2,000/mo</Text>
        </View>
      </LinearGradient>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/(teacher)/session-create")}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.actionBtnText}>New Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnOutline, { borderColor: colors.border }]}
          onPress={() => router.push("/(teacher)/sessions")}
          activeOpacity={0.85}
        >
          <Feather name="calendar" size={18} color={colors.foreground} />
          <Text style={[styles.actionBtnOutlineText, { color: colors.foreground }]}>View All</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Upcoming Sessions</Text>
      {UPCOMING_SESSIONS.map((session) => (
        <TouchableOpacity
          key={session.id}
          style={[styles.sessionRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(`/(teacher)/classroom/${session.id}`)}
          activeOpacity={0.8}
        >
          <View style={[styles.sessionDot, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="video" size={16} color={colors.primary} />
          </View>
          <View style={styles.sessionInfo}>
            <Text style={[styles.sessionSubject, { color: colors.primary }]}>{session.subject}</Text>
            <Text style={[styles.sessionTopic, { color: colors.foreground }]}>{session.topic}</Text>
            <Text style={[styles.sessionTime, { color: colors.mutedForeground }]}>{session.time}</Text>
          </View>
          <View style={styles.sessionRight}>
            <Text style={[styles.studentCount, { color: colors.mutedForeground }]}>
              {session.students}/{session.max}
            </Text>
            <Feather name="users" size={13} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>
      ))}

      {teacher.approvalStatus === "approved" && teacher.sessionsThisMonth >= 8 && (
        <View style={[styles.warningBanner, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "20" }]}>
          <Feather name="alert-triangle" size={15} color={colors.destructive} />
          <Text style={[styles.warningText, { color: colors.destructive }]}>
            You've used {teacher.sessionsThisMonth}/10 sessions this month. Upgrade your plan for more.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  name: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, justifyContent: "center", alignItems: "center" },
  bellBadge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, justifyContent: "center", alignItems: "center", paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  alertBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  alertText: { flex: 1 },
  alertTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  alertBody: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  alertAction: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsCard: { borderRadius: 20, padding: 20, gap: 16 },
  statsTitle: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#ffffff99" },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center", gap: 4 },
  statNum: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#ffffff99" },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  planBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  planBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#fff" },
  quickActions: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14 },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  actionBtnOutline: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1 },
  actionBtnOutlineText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  sessionRow: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 14 },
  sessionDot: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sessionInfo: { flex: 1, gap: 2 },
  sessionSubject: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  sessionTopic: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionTime: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sessionRight: { alignItems: "center", gap: 2 },
  studentCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  warningText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
});
