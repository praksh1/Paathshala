import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { Teacher } from "@/context/AuthContext";

const PAYMENT_HISTORY = [
  { id: "p1", amount: 2000, date: "May 2025", method: "eSewa", status: "paid" },
  { id: "p2", amount: 2000, date: "Apr 2025", method: "Khalti", status: "paid" },
  { id: "p3", amount: 2000, date: "Mar 2025", method: "eSewa", status: "paid" },
];

export default function Subscription() {
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const teacher = user as Teacher;
  const [selectedMethod, setSelectedMethod] = useState<"esewa" | "khalti">("esewa");

  const sessionsUsed = teacher?.sessionsThisMonth ?? 0;
  const sessionsRemaining = 10 - sessionsUsed;
  const progressPct = sessionsUsed / 10;

  const handlePay = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Redirecting to " + (selectedMethod === "esewa" ? "eSewa" : "Khalti"),
      `You will be redirected to ${selectedMethod === "esewa" ? "eSewa" : "Khalti"} to complete your NPR 2,000 payment for the monthly subscription.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Proceed", onPress: () => Alert.alert("Success", "Payment integration will be live soon!") },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Subscription</Text>

      <LinearGradient
        colors={["#1A365D", "#2D4A7A"]}
        style={styles.planCard}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>Sikshya Pro</Text>
            <Text style={styles.planPrice}>NPR 2,000 <Text style={styles.planPeriod}>/month</Text></Text>
          </View>
          <View style={[styles.activeBadge, { backgroundColor: teacher?.subscriptionActive ? "#22C55E30" : "#EF444430" }]}>
            <View style={[styles.dot, { backgroundColor: teacher?.subscriptionActive ? "#22C55E" : "#EF4444" }]} />
            <Text style={[styles.activeText, { color: teacher?.subscriptionActive ? "#22C55E" : "#EF4444" }]}>
              {teacher?.subscriptionActive ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        <View style={styles.planFeatures}>
          {[
            "10 sessions per month",
            "Up to 20 students per session",
            "60-minute maximum per session",
            "Session recording included",
            "Cloud storage for recordings",
            "Student payment processing",
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check-circle" size={15} color="#22C55E" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.nextBilling}>
          <Feather name="calendar" size={14} color="#ffffff66" />
          <Text style={styles.nextBillingText}>Next billing: July 1, 2025</Text>
        </View>
      </LinearGradient>

      <View style={[styles.usageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.usageTitle, { color: colors.foreground }]}>Usage This Month</Text>
        <View style={styles.usageRow}>
          <Text style={[styles.usageStat, { color: colors.foreground }]}>{sessionsUsed}/10 sessions used</Text>
          <Text style={[styles.usageRemaining, { color: colors.success }]}>{sessionsRemaining} remaining</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[styles.progressFill, {
              width: `${Math.min(progressPct * 100, 100)}%` as `${number}%`,
              backgroundColor: progressPct >= 0.8 ? colors.destructive : colors.primary,
            }]}
          />
        </View>
        <View style={styles.usageMeta}>
          <View style={styles.usageItem}>
            <Text style={[styles.usageNum, { color: colors.foreground }]}>{teacher?.totalStudents ?? 0}</Text>
            <Text style={[styles.usageLabel, { color: colors.mutedForeground }]}>Total Students</Text>
          </View>
          <View style={[styles.dividerV, { backgroundColor: colors.border }]} />
          <View style={styles.usageItem}>
            <Text style={[styles.usageNum, { color: colors.foreground }]}>NPR {(teacher?.monthlyEarnings ?? 0).toLocaleString()}</Text>
            <Text style={[styles.usageLabel, { color: colors.mutedForeground }]}>Earned This Month</Text>
          </View>
        </View>
      </View>

      <View style={[styles.paySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.payTitle, { color: colors.foreground }]}>Pay Monthly Subscription</Text>
        <Text style={[styles.paySubtitle, { color: colors.mutedForeground }]}>
          Secure payment via Nepali payment gateways
        </Text>

        <View style={styles.methodRow}>
          {(["esewa", "khalti"] as const).map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.methodBtn,
                { borderColor: selectedMethod === method ? colors.primary : colors.border, backgroundColor: selectedMethod === method ? colors.primary + "10" : colors.muted },
              ]}
              onPress={() => setSelectedMethod(method)}
              activeOpacity={0.7}
            >
              <Text style={[styles.methodIcon, { color: selectedMethod === method ? colors.primary : colors.mutedForeground }]}>
                {method === "esewa" ? "eSewa" : "Khalti"}
              </Text>
              {selectedMethod === method && <Feather name="check" size={14} color={colors.primary} />}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.payBtn, { backgroundColor: colors.primary }]} onPress={handlePay} activeOpacity={0.85}>
          <Feather name="lock" size={16} color="#fff" />
          <Text style={styles.payBtnText}>Pay NPR 2,000 via {selectedMethod === "esewa" ? "eSewa" : "Khalti"}</Text>
        </TouchableOpacity>

        <View style={styles.secureNote}>
          <Feather name="shield" size={13} color={colors.mutedForeground} />
          <Text style={[styles.secureText, { color: colors.mutedForeground }]}>
            Payments are secured with 256-bit SSL encryption
          </Text>
        </View>
      </View>

      <Text style={[styles.historyTitle, { color: colors.foreground }]}>Payment History</Text>
      {PAYMENT_HISTORY.map((p) => (
        <View key={p.id} style={[styles.historyRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.historyIcon, { backgroundColor: colors.success + "15" }]}>
            <Feather name="check" size={15} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.historyDate, { color: colors.foreground }]}>{p.date} Subscription</Text>
            <Text style={[styles.historyMethod, { color: colors.mutedForeground }]}>via {p.method}</Text>
          </View>
          <Text style={[styles.historyAmount, { color: colors.success }]}>NPR {p.amount.toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  planCard: { borderRadius: 20, padding: 22, gap: 16 },
  planHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planName: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#ffffff99", marginBottom: 4 },
  planPrice: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff" },
  planPeriod: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#ffffff80" },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  activeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  planFeatures: { gap: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffffdd" },
  nextBilling: { flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 },
  nextBillingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ffffff66" },
  usageCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  usageTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  usageRow: { flexDirection: "row", justifyContent: "space-between" },
  usageStat: { fontSize: 14, fontFamily: "Inter_500Medium" },
  usageRemaining: { fontSize: 14, fontFamily: "Inter_500Medium" },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  usageMeta: { flexDirection: "row", justifyContent: "space-around", paddingTop: 4 },
  usageItem: { alignItems: "center", gap: 4 },
  usageNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  usageLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  dividerV: { width: 1, marginVertical: 4 },
  paySection: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
  payTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  paySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  methodRow: { flexDirection: "row", gap: 12 },
  methodBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14 },
  methodIcon: { fontSize: 16, fontFamily: "Inter_700Bold" },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 16 },
  payBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  secureNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secureText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  historyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  historyIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  historyDate: { fontSize: 14, fontFamily: "Inter_500Medium" },
  historyMethod: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  historyAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
