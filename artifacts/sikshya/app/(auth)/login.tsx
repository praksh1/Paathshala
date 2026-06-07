import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Login() {
  const { role } = useLocalSearchParams<{ role: "teacher" | "student" }>();
  const resolvedRole = (role === "teacher" || role === "student") ? role : "student";
  const { login } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isTeacher = resolvedRole === "teacher";
  const accentColor = isTeacher ? colors.primary : colors.secondary;

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError("");
    const success = await login(email.trim(), password, resolvedRole);
    setLoading(false);
    if (success) {
      router.replace("/");
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: colors.background }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <LinearGradient
          colors={isTeacher ? ["#C41E3A15", "#C41E3A05"] : ["#1A365D15", "#1A365D05"]}
          style={[styles.roleTag, { borderColor: accentColor + "30" }]}
        >
          <Feather name={isTeacher ? "book-open" : "users"} size={16} color={accentColor} />
          <Text style={[styles.roleTagText, { color: accentColor }]}>
            {isTeacher ? "Teacher Login" : "Student Login"}
          </Text>
        </LinearGradient>

        <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {isTeacher
            ? "Log in to manage your sessions and students"
            : "Log in to discover teachers and join sessions"}
        </Text>

        {isTeacher && (
          <View style={[styles.demoHint, { backgroundColor: colors.accent + "15", borderColor: colors.accent + "30" }]}>
            <Feather name="info" size={14} color={colors.accent} />
            <Text style={[styles.demoText, { color: colors.accentForeground }]}>
              Demo: try ram@example.com, sunita@example.com, or any email
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Email Address</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="mail" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="your@email.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="lock" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "10" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: accentColor }, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={[styles.registerBtn, { borderColor: accentColor }]}
            onPress={() => router.push(`/(auth)/register?role=${resolvedRole}`)}
            activeOpacity={0.8}
          >
            <Text style={[styles.registerBtnText, { color: accentColor }]}>Create New Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchRole}
            onPress={() => router.replace(`/(auth)/login?role=${isTeacher ? "student" : "teacher"}`)}
          >
            <Text style={[styles.switchRoleText, { color: colors.mutedForeground }]}>
              {isTeacher ? "Looking to join as a student?" : "Are you a teacher?"}
              <Text style={{ color: accentColor }}> Switch</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { alignSelf: "flex-start", padding: 8, marginLeft: -8, marginBottom: 20 },
  roleTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, marginBottom: 20,
  },
  roleTagText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 24 },
  demoHint: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20,
  },
  demoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  form: { gap: 16 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_500Medium" },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14,
  },
  input: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  loginBtn: { borderRadius: 16, paddingVertical: 17, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.7 },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  registerBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", borderWidth: 1.5 },
  registerBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  switchRole: { alignItems: "center", paddingVertical: 8 },
  switchRoleText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
