import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Student } from "@/context/AuthContext";

const PAYMENT_METHODS = [
  { id: "pm1", type: "eSewa", account: "98*******12", verified: true },
  { id: "pm2", type: "Khalti", account: "97*******45", verified: true },
];

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const student = user as Student;

  const doLogout = async () => {
    await logout();
    router.replace("/welcome");
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && !window.confirm("Are you sure you want to log out?")) return;
      doLogout();
      return;
    }
    Alert.alert("Log Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: doLogout },
    ]);
  };

  if (!student) return null;

  const initials = student.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={[colors.secondary, "#2D4A7A"]} style={styles.profileHero}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{student.name}</Text>
        <Text style={styles.heroGrade}>{student.grade}</Text>
        <View style={[styles.studentBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Feather name="award" size={13} color="#fff" />
          <Text style={styles.studentBadgeText}>Verified Student</Text>
        </View>
      </LinearGradient>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Account Info</Text>
        <View style={styles.infoRow}>
          <Feather name="mail" size={15} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{student.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="book" size={15} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{student.grade}</Text>
        </View>
        <View style={styles.infoRow}>
          <Feather name="check-circle" size={15} color={colors.success} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            {student.enrolledSessions.length} sessions attended
          </Text>
        </View>
      </View>

      <View style={[styles.payCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.payHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Payment Methods</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.secondary + "15" }]}
            onPress={() => Alert.alert("Add Payment", "Add a new payment method via eSewa or Khalti.")}
            activeOpacity={0.7}
          >
            <Feather name="plus" size={15} color={colors.secondary} />
            <Text style={[styles.addBtnText, { color: colors.secondary }]}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.paySubtitle, { color: colors.mutedForeground }]}>
          All payments to teachers are processed securely through the Sikshya platform.
        </Text>

        {PAYMENT_METHODS.map((pm) => (
          <View key={pm.id} style={[styles.pmRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <View style={[styles.pmIcon, { backgroundColor: pm.type === "eSewa" ? "#60B246" + "20" : "#5C2D91" + "20" }]}>
              <Text style={[styles.pmName, { color: pm.type === "eSewa" ? "#60B246" : "#5C2D91" }]}>{pm.type === "eSewa" ? "e" : "K"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pmType, { color: colors.foreground }]}>{pm.type}</Text>
              <Text style={[styles.pmAccount, { color: colors.mutedForeground }]}>{pm.account}</Text>
            </View>
            {pm.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.success + "15" }]}>
                <Feather name="check" size={12} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.securityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Security</Text>
        {[
          { icon: "shield", label: "Two-factor authentication", value: "Enabled" },
          { icon: "lock", label: "Password", value: "Last changed 30 days ago" },
          { icon: "bell", label: "Session alerts", value: "SMS + Email" },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.secRow}
            onPress={() => Alert.alert(item.label, `Manage your ${item.label.toLowerCase()} settings.`)}
            activeOpacity={0.7}
          >
            <Feather name={item.icon as "shield"} size={16} color={colors.mutedForeground} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.secLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.secValue, { color: colors.mutedForeground }]}>{item.value}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.border} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.destructive + "40", backgroundColor: colors.destructive + "08" }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  profileHero: { paddingTop: 32, paddingBottom: 24, paddingHorizontal: 20, alignItems: "center", gap: 8, marginHorizontal: 20, borderRadius: 20 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center", marginBottom: 8 },
  avatarText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff" },
  heroName: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  heroGrade: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffff99" },
  studentBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  studentBadgeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#fff" },
  infoCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  payCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  payHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  paySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  pmRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  pmIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  pmName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  pmType: { fontSize: 14, fontFamily: "Inter_500Medium" },
  pmAccount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  securityCard: { marginHorizontal: 20, borderRadius: 18, borderWidth: 1, padding: 18, gap: 4 },
  secRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  secLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  secValue: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginHorizontal: 20, borderRadius: 16, borderWidth: 1, paddingVertical: 15 },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
