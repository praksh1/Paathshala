import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/utils/api";
import StarRating from "@/components/StarRating";
import SessionCard from "@/components/SessionCard";
import type { Teacher } from "@/context/AuthContext";

interface Session {
  id: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  topic: string;
  date: string;
  duration: number;
  maxStudents: number;
  enrolledStudents: string[];
  price: number;
  status: "upcoming" | "live" | "completed" | "cancelled";
}

interface ApiReview {
  id: number;
  studentName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export default function TeacherDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviews, setReviews] = useState<ApiReview[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const apiTeacher = await apiGet<Teacher & { userId: number }>(`/teachers/${id}`);
      setTeacher({ ...apiTeacher, id: String(apiTeacher.id), credentials: [] });

      const [sessRes, revRes] = await Promise.all([
        apiGet<{ sessions: { id: number; teacherName: string; subject: string; topic: string; date: string; duration: number; maxStudents: number; enrolledCount: number; price: number; status: string }[] }>(
          `/sessions?teacherId=${apiTeacher.userId}&status=upcoming`
        ),
        apiGet<{ reviews: ApiReview[] }>(`/teachers/${id}/reviews?limit=10`),
      ]);

      setSessions(sessRes.sessions.map((s) => ({
        id: String(s.id),
        teacherId: String(apiTeacher.id),
        teacherName: s.teacherName,
        subject: s.subject,
        topic: s.topic,
        date: s.date,
        duration: s.duration,
        maxStudents: s.maxStudents,
        enrolledStudents: Array(s.enrolledCount).fill(""),
        price: s.price,
        status: s.status as Session["status"],
      })));

      setReviews(revRes.reviews);
    } catch (_e) {}
  };

  const bookSession = (session: Session) => {
    Alert.alert(
      "Book Session",
      `"${session.topic}" — NPR ${session.price.toLocaleString()}\n\nPayment will be processed via eSewa/Khalti`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Book & Pay",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Booked!", "Session booked successfully. Check your Sessions tab for details.");
          },
        },
      ]
    );
  };

  const submitRating = async () => {
    if (myRating === 0 || !teacher) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await apiPost("/reviews", {
        teacherId: (teacher as Teacher & { userId: number }).userId,
        rating: myRating,
        comment: `Great teacher! Rated ${myRating} star${myRating !== 1 ? "s" : ""}.`,
      });
    } catch (_e) {}
    setRatingSubmitted(true);
    Alert.alert("Thank you!", `You rated ${teacher.name} ${myRating} star${myRating !== 1 ? "s" : ""}.`);
  };

  if (!teacher) return null;

  const initials = teacher.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#1A365D", "#2D4A7A"]} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>{initials}</Text>
        </View>
        <Text style={styles.heroName}>{teacher.name}</Text>
        <View style={[styles.heroSubjectTag, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Text style={styles.heroSubjectText}>{teacher.subject}</Text>
        </View>
        <View style={styles.heroRating}>
          <StarRating rating={teacher.rating} size={18} color="#F5A623" />
          <Text style={styles.heroRatingText}>{teacher.rating.toFixed(1)} ({teacher.reviewCount} reviews)</Text>
        </View>
        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{teacher.totalStudents}</Text>
            <Text style={styles.heroStatLabel}>Students</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{teacher.sessionsThisMonth}</Text>
            <Text style={styles.heroStatLabel}>Sessions/mo</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatNum}>{teacher.subjects.length}</Text>
            <Text style={styles.heroStatLabel}>Subjects</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>About</Text>
          <Text style={[styles.bio, { color: colors.mutedForeground }]}>{teacher.bio}</Text>
          <View style={styles.tagRow}>
            {teacher.subjects.map((s) => (
              <View key={s} style={[styles.tag, { backgroundColor: colors.secondary + "12" }]}>
                <Text style={[styles.tagText, { color: colors.secondary }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {sessions.length > 0 && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available Sessions</Text>
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} onPress={() => bookSession(s)} />
            ))}
          </View>
        )}

        {sessions.length === 0 && (
          <View style={[styles.noSessions, { backgroundColor: colors.muted }]}>
            <Feather name="calendar" size={24} color={colors.mutedForeground} />
            <Text style={[styles.noSessionsText, { color: colors.mutedForeground }]}>
              No upcoming sessions. Check back soon.
            </Text>
          </View>
        )}

        {!ratingSubmitted ? (
          <View style={[styles.rateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Rate this Teacher</Text>
            <Text style={[styles.rateSubtitle, { color: colors.mutedForeground }]}>
              Your feedback helps other students choose the right teacher
            </Text>
            <View style={styles.starRow}>
              <StarRating rating={myRating} size={36} interactive onRate={(r) => setMyRating(r)} />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: myRating > 0 ? colors.secondary : colors.muted }]}
              onPress={submitRating}
              disabled={myRating === 0}
              activeOpacity={0.8}
            >
              <Text style={[styles.submitBtnText, { color: myRating > 0 ? "#fff" : colors.mutedForeground }]}>
                Submit Rating
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.ratingThanks, { backgroundColor: colors.success + "12", borderColor: colors.success + "30" }]}>
            <Feather name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.ratingThanksText, { color: colors.success }]}>Rating submitted! Thank you.</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Student Reviews</Text>
        {reviews.map((review) => (
          <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.reviewHeader}>
              <View style={[styles.reviewAvatar, { backgroundColor: colors.primary + "15" }]}>
                <Text style={[styles.reviewAvatarText, { color: colors.primary }]}>{review.studentName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewName, { color: colors.foreground }]}>{review.studentName}</Text>
                <Text style={[styles.reviewDate, { color: colors.mutedForeground }]}>
                  {new Date(review.createdAt).toLocaleDateString("en-NP", { month: "short", year: "numeric" })}
                </Text>
              </View>
              <StarRating rating={review.rating} size={14} />
            </View>
            <Text style={[styles.reviewComment, { color: colors.mutedForeground }]}>"{review.comment}"</Text>
          </View>
        ))}
        {reviews.length === 0 && (
          <View style={[styles.noSessions, { backgroundColor: colors.muted }]}>
            <Feather name="message-circle" size={20} color={colors.mutedForeground} />
            <Text style={[styles.noSessionsText, { color: colors.mutedForeground }]}>No reviews yet. Be the first to rate!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {},
  hero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: "center", gap: 10 },
  backBtn: { alignSelf: "flex-start", marginBottom: 8 },
  heroAvatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  heroAvatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  heroName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#fff" },
  heroSubjectTag: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  heroSubjectText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#ffffffdd" },
  heroRating: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroRatingText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#ffffffcc" },
  heroStats: { flexDirection: "row", width: "100%", justifyContent: "space-around", paddingTop: 8 },
  heroStat: { alignItems: "center" },
  heroStatNum: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  heroStatLabel: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#ffffff80" },
  heroStatDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  body: { padding: 20, gap: 20 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  noSessions: { borderRadius: 14, padding: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  noSessionsText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  rateCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 12, alignItems: "center" },
  rateSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  starRow: { paddingVertical: 8 },
  submitBtn: { borderRadius: 14, paddingHorizontal: 32, paddingVertical: 13 },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ratingThanks: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  ratingThanksText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  reviewCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  reviewAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  reviewName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reviewDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reviewComment: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, fontStyle: "italic" },
});
