import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: "#C41E3A" }]}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingText}>Sikshya</Text>
      </View>
    );
  }

  if (user?.role === "teacher") return <Redirect href="/(teacher)" />;
  if (user?.role === "student") return <Redirect href="/(student)" />;
  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  loadingText: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -1 },
});
