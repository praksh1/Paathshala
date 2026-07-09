import { Feather } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import type { Student } from "@/context/AuthContext";
import { apiGet } from "@/utils/api";
import { useClassroomSocket } from "@/hooks/useClassroomSocket";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import JitsiEmbed from "@/components/JitsiEmbed";
import { Image } from "react-native";

const SCREEN_W = Dimensions.get("window").width;
type Mode = "board" | "chat" | "call";
const REACTION_EMOJIS = ["👍", "🙋", "❓", "😊", "🔥"];

interface SessionData {
  id: number; topic: string; subject: string; teacherName: string;
  duration: number; maxStudents: number; enrolledCount: number; status: string;
}

export default function StudentClassroom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const student = user as Student;
  if (!student || student.role !== "student") return null;

  const studentName = student.name ?? "Student";

  const { connected, presenceCount, messages, remotePaths, floatingReactions, material, sendChat, sendReaction } =
    useClassroomSocket({ sessionId: id ?? "", name: studentName, role: "student" });

  useMediaPermissions();

  const [session, setSession] = useState<SessionData | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [chatMsg, setChatMsg] = useState("");
  const [mode, setMode] = useState<Mode>("board");
  const [isLandscape, setIsLandscape] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadSession();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [id]);

  const loadSession = async () => {
    try { setSession(await apiGet<SessionData>(`/sessions/${id}`)); } catch {}
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const toggleLandscape = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      }
      setIsLandscape((v) => !v);
    } catch {}
  };

  const sendMessage = () => {
    if (!chatMsg.trim()) return;
    sendChat(chatMsg.trim());
    setChatMsg("");
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const leaveSession = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Leave Session?\n\nAre you sure?")) router.back();
    } else {
      Alert.alert("Leave Session", "Are you sure you want to leave?", [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => router.back() },
      ]);
    }
  };

  const roomName = `SikshyaSession${id}`;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerInfo}>
            <Text style={s.sessionTitle} numberOfLines={1}>{session?.topic ?? "Live Session"}</Text>
            <Text style={s.sessionSub}>{session?.subject ?? ""} · {fmt(elapsed)}</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={toggleLandscape} activeOpacity={0.8}>
              <Feather name={isLandscape ? "minimize-2" : "maximize-2"} size={15} color="#aaa" />
            </TouchableOpacity>
            <View style={s.liveTag}>
              <View style={[s.liveDot, { backgroundColor: connected ? "#fff" : "#ff0" }]} />
              <Text style={s.liveText}>LIVE</Text>
            </View>
            <TouchableOpacity style={s.leaveBtn} onPress={leaveSession} activeOpacity={0.8}>
              <Feather name="phone-off" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Teacher banner */}
        <View style={s.teacherBanner}>
          <View style={s.teacherAvatar}>
            <Text style={s.teacherAvatarText}>{session?.teacherName?.[0]?.toUpperCase() ?? "T"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.teacherName}>{session?.teacherName ?? "Teacher"} is presenting</Text>
            <Text style={s.enrolledText}>{presenceCount > 0 ? presenceCount : (session?.enrolledCount ?? 0)} in session</Text>
          </View>
          <View style={s.onlineRow}>
            <View style={[s.onlineDot, { backgroundColor: connected ? "#22C55E" : "#F59E0B" }]} />
            <Text style={[s.onlineText, { color: connected ? "#22C55E" : "#F59E0B" }]}>
              {connected ? "Live" : "Connecting…"}
            </Text>
          </View>
        </View>

        {/* Mode tabs */}
        <View style={s.modeSwitcher}>
          {(["board", "chat", "call"] as Mode[]).map((m) => (
            <TouchableOpacity key={m} style={[s.modeTab, mode === m && s.modeTabActive]} onPress={() => setMode(m)} activeOpacity={0.7}>
              <Feather name={m === "board" ? "monitor" : m === "chat" ? "message-circle" : "phone"} size={13} color={mode === m ? "#fff" : "#666"} />
              <Text style={[s.modeText, mode === m && s.modeTextActive]}>
                {m === "board" ? "Whiteboard" : m === "chat" ? `Chat${messages.length > 0 ? ` (${messages.length})` : ""}` : "Call"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content area — board/chat switch, call is a persistent overlay */}
        <View style={s.contentArea}>
        {/* Board — live whiteboard from teacher */}
        {mode === "board" && (
          <View style={s.boardArea}>
            {material?.kind === "image" && (
              <Image source={{ uri: material.dataUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            )}
            {material?.kind === "pdf" && Platform.OS === "web" &&
              React.createElement("iframe", {
                src: material.dataUrl,
                style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", pointerEvents: "none" },
              })}
            <Svg style={StyleSheet.absoluteFill}>
              {remotePaths.map((p, i) => (
                <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
            {remotePaths.length === 0 && !material && (
              <View style={s.boardEmpty}>
                <Feather name="edit-3" size={36} color="#CCC" />
                <Text style={s.boardEmptyTitle}>Teacher's Whiteboard</Text>
                <Text style={s.boardEmptySub}>Content will appear here as the teacher draws.</Text>
              </View>
            )}
            {/* Reactions bar */}
            <View style={s.reactionsBarAbs}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity key={emoji} style={s.reactionBtn} onPress={() => sendReaction(emoji)} activeOpacity={0.7}>
                  <Text style={s.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Chat */}
        {mode === "chat" && (
          <View style={s.flex}>
            <ScrollView ref={scrollRef} style={s.flex} contentContainerStyle={s.chatContent} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
              {messages.length === 0 && (
                <Text style={s.emptyChat}>No messages yet. Send a question to the teacher!</Text>
              )}
              {messages.map((msg) => (
                <View key={msg.id} style={[s.bubble, msg.isMe && s.bubbleMe]}>
                  {!msg.isMe && <Text style={s.bubbleSender}>{msg.senderName}</Text>}
                  <View style={[s.bubbleBody, { backgroundColor: msg.isMe ? "#C41E3A" : msg.role === "teacher" ? "#1A365D" : "#1E1E1E" }]}>
                    <Text style={s.bubbleText}>{msg.text}</Text>
                  </View>
                  <Text style={s.bubbleTime}>{msg.time}</Text>
                </View>
              ))}
            </ScrollView>
            <View style={s.reactionsBar}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity key={emoji} style={s.reactionBtn} onPress={() => sendReaction(emoji)} activeOpacity={0.7}>
                  <Text style={s.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput style={s.input} value={chatMsg} onChangeText={setChatMsg} placeholder="Ask the teacher…" placeholderTextColor="#555" onSubmitEditing={sendMessage} returnKeyType="send" />
              <TouchableOpacity style={s.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
                <Feather name="send" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Call — persistently mounted so it never reconnects when switching tabs.
            Shown fullscreen on the Call tab, or as a floating PiP over the whiteboard otherwise. */}
        <View style={mode === "call" ? s.jitsiFull : s.jitsiPip} pointerEvents="box-none">
          <JitsiEmbed roomName={roomName} displayName={studentName} style={StyleSheet.absoluteFill} />
          {mode !== "call" && (
            <TouchableOpacity style={s.pipExpand} onPress={() => setMode("call")} activeOpacity={0.8}>
              <Feather name="maximize-2" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        </View>

        {/* Floating reactions */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {floatingReactions.map((r) => (
            <Animated.View
              key={r.id}
              style={{
                position: "absolute",
                bottom: 160,
                left: r.x * SCREEN_W,
                opacity: r.opacity,
                transform: [{ translateY: r.translateY }],
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 32 }}>{r.emoji}</Text>
              <Text style={{ fontSize: 10, color: "#ccc" }}>{r.senderName}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  headerInfo: { flex: 1, marginRight: 10 },
  sessionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  sessionSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#888", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#C41E3A", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  leaveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  teacherBanner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#111" },
  teacherAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1A365D", justifyContent: "center", alignItems: "center" },
  teacherAvatarText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  teacherName: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#ddd" },
  enrolledText: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#666", marginTop: 2 },
  onlineRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  onlineText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modeSwitcher: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  modeTab: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 13, paddingVertical: 7, backgroundColor: "#1A1A1A" },
  modeTabActive: { backgroundColor: "#2A2A2A" },
  modeText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#666" },
  modeTextActive: { color: "#fff" },
  boardArea: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 14, backgroundColor: "#fff", overflow: "hidden" },
  boardEmpty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 30, gap: 12 },
  boardEmptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#222", textAlign: "center" },
  boardEmptySub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#777", textAlign: "center", lineHeight: 20 },
  reactionsBarAbs: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.15)" },
  reactionsBar: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#0D0D0D" },
  reactionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  reactionEmoji: { fontSize: 19 },
  chatContent: { padding: 14, gap: 10 },
  emptyChat: { textAlign: "center", color: "#555", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 40 },
  bubble: { maxWidth: "80%", gap: 3 },
  bubbleMe: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubbleSender: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#666", marginLeft: 4 },
  bubbleBody: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff" },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#1A1A1A" },
  input: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff" },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#C41E3A", justifyContent: "center", alignItems: "center" },
  contentArea: { flex: 1, position: "relative" },
  jitsiFull: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 30 },
  jitsiPip: {
    position: "absolute", bottom: 14, right: 14, width: 118, height: 158,
    borderRadius: 14, overflow: "hidden", backgroundColor: "#000",
    borderWidth: 2, borderColor: "#2A2A2A", zIndex: 20,
    shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 8,
  },
  pipExpand: {
    position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center",
  },
});
