import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import StarRating from "./StarRating";
import type { Teacher } from "@/context/AuthContext";

interface TeacherCardProps {
  teacher: Teacher;
  onPress?: () => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6",
  Science: "#10B981",
  English: "#8B5CF6",
  Nepali: "#F59E0B",
  "Computer Science": "#EC4899",
  History: "#6B7280",
  Geography: "#14B8A6",
};

export default function TeacherCard({ teacher, onPress }: TeacherCardProps) {
  const colors = useColors();
  const subjectColor = SUBJECT_COLORS[teacher.subject] ?? colors.primary;

  const initials = teacher.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: subjectColor + "20" }]}>
          <Text style={[styles.initials, { color: subjectColor }]}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]}>{teacher.name}</Text>
          <View style={[styles.subjectTag, { backgroundColor: subjectColor + "15" }]}>
            <Text style={[styles.subject, { color: subjectColor }]}>{teacher.subject}</Text>
          </View>
          <View style={styles.ratingRow}>
            <StarRating rating={teacher.rating} size={13} />
            <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
              {teacher.rating.toFixed(1)} ({teacher.reviewCount} reviews)
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
        {teacher.bio}
      </Text>

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Feather name="users" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {teacher.totalStudents} students
          </Text>
        </View>
        <View style={styles.stat}>
          <Feather name="book" size={13} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {teacher.subjects.length} subjects
          </Text>
        </View>
        <View style={[styles.availTag, { backgroundColor: colors.success + "15" }]}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.availText, { color: colors.success }]}>Available</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  initials: { fontSize: 18, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  subjectTag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  subject: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  ratingText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 12 },
  footer: { flexDirection: "row", alignItems: "center", gap: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  availTag: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
