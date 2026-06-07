import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useColors } from "@/hooks/useColors";
import { TEACHERS_KEY, SAMPLE_TEACHERS } from "@/context/AuthContext";
import TeacherCard from "@/components/TeacherCard";
import type { Teacher } from "@/context/AuthContext";

const SUBJECTS = ["All", "Mathematics", "Science", "English", "Nepali", "Computer Science", "History"];

export default function Discover() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("All");
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadTeachers();
    }, [])
  );

  const loadTeachers = async () => {
    const stored = await AsyncStorage.getItem(TEACHERS_KEY);
    const all: Teacher[] = stored ? JSON.parse(stored) : SAMPLE_TEACHERS;
    setTeachers(all.filter((t) => t.approvalStatus === "approved"));
  };

  const filtered = teachers.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subject === "All" || t.subject === subject;
    return matchSearch && matchSubject;
  });

  const featured = filtered.slice(0, 2);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Find Teachers</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Nepal's best verified teachers
        </Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={17} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by name or subject..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SUBJECTS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, { backgroundColor: subject === s ? colors.secondary : colors.muted, borderColor: subject === s ? colors.secondary : colors.border }]}
              onPress={() => setSubject(s)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, { color: subject === s ? "#fff" : colors.mutedForeground }]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        scrollEnabled={!!filtered.length}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <View style={styles.countRow}>
              <Text style={[styles.countText, { color: colors.mutedForeground }]}>
                {filtered.length} teacher{filtered.length !== 1 ? "s" : ""} found
              </Text>
              <TouchableOpacity style={styles.sortBtn} activeOpacity={0.7}>
                <Feather name="sliders" size={15} color={colors.mutedForeground} />
                <Text style={[styles.sortText, { color: colors.mutedForeground }]}>Sort by Rating</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TeacherCard
            teacher={item}
            onPress={() => router.push(`/(student)/teacher/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No teachers found</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Try a different search or subject filter
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 13 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  chips: { paddingBottom: 4, gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  countRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  countText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sortBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  sortText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
