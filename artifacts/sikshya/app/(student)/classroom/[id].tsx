import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { apiGet } from "@/utils/api";
import { useAuth } from "@/context/AuthContext";
import type { Student } from "@/context/AuthContext";

interface SessionData {
  id: number;
  topic: string;
  subject: string;
  teacherName: string;
  duration: number;
  maxStudents: number;
  enrolledCount: number;
  status: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

const TEACHER_MESSAGES: ChatMessage[] = [
  { id: "t1", sender: "Teacher", text: "Welcome everyone! Let's begin today's session.", time: "3:00 PM", isMe: false },
  { id: "t2", sender: "Teacher", text: "Please feel free to ask questions in the chat.", time: "3:01 PM", isMe: false },
];

type Mode = "board" | "chat";

export default function StudentClassroom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const student = user as Student;

  const [session, setSession] = useState<SessionData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>(TEACHER_MESSAGES);
  const [chatMsg, setChatMsg] = useState("");
  const [mode, setMode] = useState<Mode>("board");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadSession();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  const loadSession = async () => {
    try {
      const data = await apiGet<SessionData>(`/sessions/${id}`);
      setSession(data);
    } catch {}
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const sendMessage = () => {
    if (!chatMsg.trim()) return;
    const name = student?.name?.split(" ")[0] ?? "Student";
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: name,
      text: chatMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isMe: true,
    };
    setChat((prev) => [...prev, msg]);
    setChatMsg("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const leaveSession = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Leave Session?\n\nAre you sure you want to leave?")) router.back();
    } else {
      Alert.alert("Leave Session", "Are you sure you want to leave?", [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => router.back() },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0A0A0A" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {session ? session.topic : "Live Session"}
            </Text>
            <Text style={styles.sessionSub}>
              {session?.subject ?? ""} · {formatTime(elapsed)}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <TouchableOpacity style={styles.leaveBtn} onPress={leaveSession} activeOpacity={0.8}>
              <Feather name="phone-off" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Teacher banner */}
        <View style={styles.teacherBanner}>
          <View style={styles.teacherAvatar}>
            <Text style={styles.teacherAvatarText}>
              {session?.teacherName ? session.teacherName[0].toUpperCase() : "T"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.teacherName}>{session?.teacherName ?? "Teacher"} is presenting</Text>
            <Text style={styles.enrolledText}>{session?.enrolledCount ?? 0} students enrolled</Text>
          </View>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Live</Text>
          </View>
        </View>

        {/* Mode switcher */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeTab, mode === "board" && styles.modeTabActive]}
            onPress={() => setMode("board")}
            activeOpacity={0.7}
          >
            <Feather name="monitor" size={14} color={mode === "board" ? "#fff" : "#666"} />
            <Text style={[styles.modeText, mode === "board" && styles.modeTextActive]}>Whiteboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === "chat" && styles.modeTabActive]}
            onPress={() => setMode("chat")}
            activeOpacity={0.7}
          >
            <Feather name="message-circle" size={14} color={mode === "chat" ? "#fff" : "#666"} />
            <Text style={[styles.modeText, mode === "chat" && styles.modeTextActive]}>
              Chat ({chat.filter((m) => !m.isMe).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Board view */}
        {mode === "board" && (
          <View style={styles.boardArea}>
            <View style={styles.boardPlaceholder}>
              <Feather name="monitor" size={52} color="#CCC" />
              <Text style={styles.boardTitle}>
                {session?.teacherName ?? "The teacher"}'s Whiteboard
              </Text>
              <Text style={styles.boardSubtitle}>
                The teacher is drawing on the board. In a real-time setup, you would see the board content streaming live here.
              </Text>
              <TouchableOpacity
                style={styles.chatHint}
                onPress={() => setMode("chat")}
                activeOpacity={0.8}
              >
                <Feather name="message-circle" size={14} color="#1A365D" />
                <Text style={styles.chatHintText}>Switch to Chat to ask questions →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Chat view */}
        {mode === "chat" && (
          <View style={styles.chatContainer}>
            <ScrollView
              ref={scrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContent}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            >
              {chat.map((msg) => (
                <View key={msg.id} style={[styles.bubble, msg.isMe && styles.bubbleMe]}>
                  {!msg.isMe && <Text style={styles.bubbleSender}>{msg.sender}</Text>}
                  <View style={[styles.bubbleBody, { backgroundColor: msg.isMe ? "#C41E3A" : "#1E1E1E" }]}>
                    <Text style={styles.bubbleText}>{msg.text}</Text>
                  </View>
                  <Text style={styles.bubbleTime}>{msg.time}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput
                style={styles.input}
                value={chatMsg}
                onChangeText={setChatMsg}
                placeholder="Ask the teacher..."
                placeholderTextColor="#555"
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={sendMessage}
                activeOpacity={0.8}
              >
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerInfo: { flex: 1, marginRight: 12 },
  sessionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  sessionSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#C41E3A", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  leaveBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  teacherBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#111",
  },
  teacherAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A365D", justifyContent: "center", alignItems: "center" },
  teacherAvatarText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  teacherName: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#ddd" },
  enrolledText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
  onlineText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#22C55E" },
  modeSwitcher: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  modeTab: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#1A1A1A" },
  modeTabActive: { backgroundColor: "#2A2A2A" },
  modeText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#666" },
  modeTextActive: { color: "#fff" },
  boardArea: { flex: 1, margin: 12, borderRadius: 16, backgroundColor: "#fff", overflow: "hidden" },
  boardPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 16 },
  boardTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: "#222", textAlign: "center" },
  boardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#777", textAlign: "center", lineHeight: 22 },
  chatHint: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EBF4FF", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, marginTop: 8 },
  chatHintText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#1A365D" },
  chatContainer: { flex: 1 },
  chatScroll: { flex: 1 },
  chatContent: { padding: 16, gap: 12 },
  bubble: { maxWidth: "80%", gap: 4 },
  bubbleMe: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubbleSender: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#666", marginLeft: 4 },
  bubbleBody: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff" },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555" },
  inputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#1A1A1A",
  },
  input: {
    flex: 1, backgroundColor: "#1A1A1A", borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14,
    fontFamily: "Inter_400Regular", color: "#fff",
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#C41E3A", justifyContent: "center", alignItems: "center" },
});
