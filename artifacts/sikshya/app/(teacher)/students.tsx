import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import StarRating from "@/components/StarRating";

const MOCK_STUDENTS = [
  { id: "s1", name: "Aarav Shrestha", grade: "Grade 10", joinedDate: "Jan 2025", sessionsAttended: 12, lastActive: "Today", rating: 5, comment: "Excellent teacher!" },
  { id: "s2", name: "Sita Gurung", grade: "Grade 11", joinedDate: "Feb 2025", sessionsAttended: 8, lastActive: "Yesterday", rating: 5, comment: "Very clear explanations." },
  { id: "s3", name: "Ramesh Karki", grade: "Grade 12", joinedDate: "Dec 2024", sessionsAttended: 20, lastActive: "3 days ago", rating: 4, comment: "Good sessions overall." },
  { id: "s4", name: "Puja Rai", grade: "Grade 10", joinedDate: "Mar 2025", sessionsAttended: 5, lastActive: "1 week ago", rating: 5, comment: "Best math teacher!" },
  { id: "s5", name: "Bikash Tamang", grade: "Grade 11", joinedDate: "Jan 2025", sessionsAttended: 15, lastActive: "2 days ago", rating: 4, comment: "Helpful and patient." },
  { id: "s6", name: "Anita Basnet", grade: "Grade 12", joinedDate: "Nov 2024", sessionsAttended: 24, lastActive: "Today", rating: 5, comment: "Transformed my understanding." },
];

export default function TeacherStudents() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = MOCK_STUDENTS.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.grade.toLowerCase().includes(search.toLowerCase())
  );

  const avgRating = MOCK_STUDENTS.reduce((acc, s) => acc + s.rating, 0) / MOCK_STUDENTS.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Students</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: colors.primary + "12" }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{MOCK_STUDENTS.length}</Text>
            <Text style={[styles.statLabel, { color: colors.primary }]}>Students</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.success + "12" }]}>
            <StarRating rating={avgRating} size={14} />
            <Text style={[styles.statNum, { color: colors.success }]}>{avgRating.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.success }]}>Avg Rating</Text>
          </View>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search students..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        scrollEnabled={!!filtered.length}
        renderItem={({ item }) => {
          const initials = item.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
                </View>
                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.studentGrade, { color: colors.mutedForeground }]}>{item.grade}</Text>
                </View>
                <View style={[styles.activeBadge, { backgroundColor: item.lastActive === "Today" ? colors.success + "15" : colors.muted }]}>
                  <Text style={[styles.activeText, { color: item.lastActive === "Today" ? colors.success : colors.mutedForeground }]}>
                    {item.lastActive}
                  </Text>
                </View>
              </View>
              <View style={styles.cardMeta}>
                <View style={styles.metaItem}>
                  <Feather name="calendar" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>Joined {item.joinedDate}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="check-circle" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.sessionsAttended} sessions</Text>
                </View>
              </View>
              {!!item.comment && (
                <View style={[styles.review, { backgroundColor: colors.muted }]}>
                  <StarRating rating={item.rating} size={13} />
                  <Text style={[styles.reviewText, { color: colors.mutedForeground }]}>"{item.comment}"</Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="users" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No students found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 14 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statsRow: { flexDirection: "row", gap: 12 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  statNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  initials: { fontSize: 16, fontFamily: "Inter_700Bold" },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  studentGrade: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  activeBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  activeText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cardMeta: { flexDirection: "row", gap: 16, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  review: { borderRadius: 10, padding: 10, gap: 6 },
  reviewText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
