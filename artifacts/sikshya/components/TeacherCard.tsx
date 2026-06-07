import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import StarRating from "./StarRating";
import type { Teacher } from "@/context/AuthContext";

interface TeacherCardProps {
  teacher: Teacher;
  onPress?: () => void;
  compact?: boolean;
}

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#3B82F6",
  Science: "#10B981",
  English: "#8B5CF6",
  Nepali: "#F59E0B",
  "Computer Science": "#EC4899",
  History: "#6B7280",
  Geography: "#14B8A6",
  Economics: "#F97316",
};

export default function TeacherCard({ teacher, onPress, compact }: TeacherCardProps) {
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
      {/* Top row — avatar + core info */}
      <View style={styles.topRow}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: subjectColor + "20" }]}>
            <Text style={[styles.initials, { color: subjectColor }]}>{initials}</Text>
          </View>
          {teacher.isOnline && (
            <View style={[styles.onlineDot, { backgroundColor: "#22C55E", borderColor: colors.card }]} />
          )}
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {teacher.name}
            </Text>
            {teacher.approvalStatus === "approved" && (
              <Feather name="check-circle" size={14} color={colors.primary} />
            )}
          </View>

          <View style={[styles.subjectTag, { backgroundColor: subjectColor + "15" }]}>
            <Text style={[styles.subject, { color: subjectColor }]}>{teacher.subject}</Text>
          </View>

          <View style={styles.ratingRow}>
            <StarRating rating={teacher.rating} size={12} />
            <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
              {teacher.rating.toFixed(1)}
            </Text>
            <Text style={[styles.reviewCount, { color: colors.mutedForeground }]}>
              ({teacher.reviewCount})
            </Text>
          </View>
        </View>

        {/* Price badge */}
        {teacher.pricePerSession != null && (
          <View style={[styles.priceBadge, { backgroundColor: colors.primary + "12" }]}>
            <Text style={[styles.priceAmt, { color: colors.primary }]}>
              NPR {teacher.pricePerSession.toLocaleString()}
            </Text>
            <Text style={[styles.priceLabel, { color: colors.primary + "99" }]}>/session</Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {!compact && (
        <Text style={[styles.bio, { color: colors.mutedForeground }]} numberOfLines={2}>
          {teacher.bio}
        </Text>
      )}

      {/* Sub-subjects */}
      {!compact && teacher.subjects.length > 0 && (
        <View style={styles.subjectChips}>
          {teacher.subjects.slice(0, 3).map((s) => (
            <View key={s} style={[styles.subChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.subChipText, { color: colors.mutedForeground }]}>{s}</Text>
            </View>
          ))}
          {teacher.subjects.length > 3 && (
            <Text style={[styles.moreChip, { color: colors.mutedForeground }]}>
              +{teacher.subjects.length - 3}
            </Text>
          )}
        </View>
      )}

      {/* Footer stats */}
      <View style={[styles.footer, compact && { marginTop: 8 }]}>
        <View style={styles.stat}>
          <Feather name="users" size={12} color={colors.mutedForeground} />
          <Text style={[styles.statText, { color: colors.mutedForeground }]}>
            {teacher.totalStudents} students
          </Text>
        </View>

        {teacher.experienceYears != null && (
          <View style={styles.stat}>
            <Feather name="award" size={12} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]}>
              {teacher.experienceYears}y exp
            </Text>
          </View>
        )}

        {teacher.location && (
          <View style={styles.stat}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.statText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {teacher.location}
            </Text>
          </View>
        )}

        <View style={[styles.availTag, { backgroundColor: teacher.isOnline ? "#22C55E15" : colors.muted }]}>
          <View style={[styles.dot, { backgroundColor: teacher.isOnline ? "#22C55E" : colors.border }]} />
          <Text style={[styles.availText, { color: teacher.isOnline ? "#22C55E" : colors.mutedForeground }]}>
            {teacher.isOnline ? "Online" : "Available"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 12 },
  topRow: { flexDirection: "row", gap: 12, marginBottom: 10, alignItems: "flex-start" },
  avatarWrap: { position: "relative" },
  avatar: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  initials: { fontSize: 18, fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1 },
  subjectTag: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
  subject: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  reviewCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  priceBadge: { borderRadius: 10, padding: 8, alignItems: "center" },
  priceAmt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  priceLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 10 },
  subjectChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  subChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  subChipText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  moreChip: { fontSize: 11, fontFamily: "Inter_400Regular", alignSelf: "center" },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  availTag: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  availText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
