import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Landing() {
  const { user, isLoading } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: "#C41E3A" }]}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingText}>Sikshya</Text>
      </View>
    );
  }

  if (user?.role === "teacher") return <Redirect href="/(teacher)/" />;
  if (user?.role === "student") return <Redirect href="/(student)/" />;

  return (
    <LinearGradient
      colors={["#1A365D", "#C41E3A"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.header}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.appName}>Sikshya</Text>
        <Text style={styles.tagline}>Nepal's Premier Teaching Platform</Text>
        <Text style={styles.taglineNepali}>शिक्षा • ज्ञान • समृद्धि</Text>
      </View>

      <View style={styles.heroContainer}>
        <Image
          source={require("../assets/images/hero_classroom.png")}
          style={styles.heroImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={["transparent", "rgba(26,54,93,0.6)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.heroStats}>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>5,000+</Text>
            <Text style={styles.statLabel}>Teachers</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>50,000+</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>77</Text>
            <Text style={styles.statLabel}>Districts</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.chooseText}>Choose your role to get started</Text>

        <TouchableOpacity
          style={styles.teacherBtn}
          onPress={() => router.push("/(auth)/login?role=teacher")}
          activeOpacity={0.85}
        >
          <View style={styles.btnIcon}>
            <Feather name="book-open" size={20} color="#C41E3A" />
          </View>
          <View style={styles.btnTextBlock}>
            <Text style={styles.teacherBtnTitle}>I am a Teacher</Text>
            <Text style={styles.teacherBtnSub}>Share your knowledge, earn income</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#C41E3A" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.studentBtn}
          onPress={() => router.push("/(auth)/login?role=student")}
          activeOpacity={0.85}
        >
          <View style={styles.btnIconWhite}>
            <Feather name="users" size={20} color="#fff" />
          </View>
          <View style={styles.btnTextBlock}>
            <Text style={styles.studentBtnTitle}>I am a Student</Text>
            <Text style={styles.studentBtnSub}>Learn from Nepal's best teachers</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#ffffff80" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1 },
  container: { flex: 1 },
  header: { alignItems: "center", paddingTop: 32, paddingBottom: 16, paddingHorizontal: 24 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 14 },
  appName: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1.5 },
  tagline: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#ffffffcc", marginTop: 4, textAlign: "center" },
  taglineNepali: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#ffffff66", marginTop: 4 },
  heroContainer: { flex: 1, marginHorizontal: 20, borderRadius: 24, overflow: "hidden" },
  heroImage: { width: "100%", height: "100%" },
  heroStats: {
    position: "absolute", bottom: 16, left: 16, right: 16,
    flexDirection: "row", justifyContent: "space-around",
  },
  statPill: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#ffffffaa" },
  footer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 12 },
  chooseText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#ffffffaa", textAlign: "center", marginBottom: 4 },
  teacherBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16,
  },
  btnIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#C41E3A15", justifyContent: "center", alignItems: "center" },
  btnIconWhite: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  btnTextBlock: { flex: 1 },
  teacherBtnTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#0D0D0D" },
  teacherBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#6B7280", marginTop: 2 },
  studentBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  studentBtnTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  studentBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#ffffffaa", marginTop: 2 },
});
