import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ScreenOrientation from "expo-screen-orientation";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
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
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { Teacher } from "@/context/AuthContext";
import { apiGet, apiPatch } from "@/utils/api";
import { useClassroomSocket, type DrawPath } from "@/hooks/useClassroomSocket";
import { useMediaPermissions } from "@/hooks/useMediaPermissions";
import JitsiEmbed from "@/components/JitsiEmbed";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "react-native";

const SCREEN_W = Dimensions.get("window").width;
type Mode = "whiteboard" | "participants" | "chat" | "call";

const COLORS_PALETTE = ["#0D0D0D", "#C41E3A", "#1A365D", "#16A34A", "#F5A623", "#8B5CF6", "#FFFFFF"];
const PEN_SIZES = [3, 6, 10];
const REACTION_EMOJIS = ["👍", "🙋", "❓", "😊", "🔥"];

interface SessionData {
  id: number; topic: string; subject: string; teacherName: string;
  duration: number; maxStudents: number; enrolledCount: number; status: string;
}

export default function Classroom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const teacher = user as Teacher;
  if (!teacher || teacher.role !== "teacher") return null;

  const teacherName = teacher.name ?? "Teacher";

  const { connected, presenceCount, messages, floatingReactions, material, sendChat, sendReaction, sendDrawCommit, sendBoardClear, sendMaterial, clearMaterial } =
    useClassroomSocket({ sessionId: id ?? "", name: teacherName, role: "teacher" });

  useMediaPermissions();

  const [session, setSession] = useState<SessionData | null>(null);
  const [mode, setMode] = useState<Mode>("whiteboard");
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [penColor, setPenColor] = useState("#0D0D0D");
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chatMsg, setChatMsg] = useState("");
  const [isLandscape, setIsLandscape] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);

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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      setCurrentPath((p) => `${p} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
    },
    onPanResponderRelease: () => {
      if (currentPath) {
        const color = isEraser ? "#FFFFFF" : penColor;
        const width = isEraser ? 24 : penSize;
        setPaths((prev) => [...prev, { d: currentPath, color, width }]);
        sendDrawCommit(currentPath, color, width);
        setCurrentPath("");
      }
    },
  });

  const clearBoard = () => {
    setPaths([]);
    setCurrentPath("");
    sendBoardClear();
  };

  const handleUploadMaterial = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/png,image/jpeg,application/pdf";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const kind = file.type === "application/pdf" ? "pdf" : "image";
          sendMaterial(dataUrl, kind);
        };
        reader.readAsDataURL(file);
      };
      input.click();
      return;
    }

    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "application/pdf"],
        copyToCacheDirectory: true,
      });
      if (doc.canceled || !doc.assets?.[0]) return;
      const asset = doc.assets[0];
      const kind = asset.mimeType === "application/pdf" ? "pdf" : "image";
      if (kind === "pdf") {
        Alert.alert("PDF Preview", "PDF annotation backgrounds are supported on the web app. On mobile, please upload an image (PNG/JPG) instead.");
        return;
      }
      sendMaterial(asset.uri, kind);
    } catch {
      Alert.alert("Upload Failed", "Could not upload the material. Please try again.");
    }
  };

  const toggleRecording = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const msg = !isRecording ? "Recording started." : "Recording saved to Sikshya cloud.";
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(!isRecording ? "Recording Started" : "Recording Saved", msg);
    setIsRecording((r) => !r);
  };

  const endSession = async () => {
    const doEnd = async () => {
      try { await apiPatch(`/sessions/${id}`, { status: "completed" }); } catch {}
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("End Session?\n\nThis will mark the session as completed.")) await doEnd();
    } else {
      Alert.alert("End Session?", "This will mark the session as completed.", [
        { text: "Cancel", style: "cancel" },
        { text: "End Session", style: "destructive", onPress: doEnd },
      ]);
    }
  };

  const sendMessage = () => {
    if (!chatMsg.trim()) return;
    sendChat(chatMsg.trim());
    setChatMsg("");
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const participantCount = presenceCount > 0 ? presenceCount : (session?.enrolledCount ?? 0);

  const roomName = `SikshyaSession${String(id ?? "").replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#0A0A0A" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[s.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.sessionInfo}>
              <Text style={s.sessionTitle} numberOfLines={1}>
                {session ? `${session.subject}: ${session.topic}` : "Live Session"}
              </Text>
              <Text style={s.timer}>{fmt(elapsed)} / {String(session?.duration ?? 60).padStart(2, "0")}:00</Text>
            </View>
            <View style={[s.liveTag, { backgroundColor: colors.primary }]}>
              <View style={[s.liveDot, { backgroundColor: connected ? "#fff" : "#ff0" }]} />
              <Text style={s.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={toggleLandscape} activeOpacity={0.8}>
              <Feather name={isLandscape ? "minimize-2" : "maximize-2"} size={16} color="#aaa" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.recBtn, { backgroundColor: isRecording ? colors.destructive : "#333" }]} onPress={toggleRecording} activeOpacity={0.8}>
              <Feather name="circle" size={13} color="#fff" />
              <Text style={s.recText}>{isRecording ? "Stop" : "Rec"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.endBtn} onPress={endSession} activeOpacity={0.8}>
              <Feather name="phone-off" size={14} color="#EF4444" />
              <Text style={s.endBtnText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Presence */}
        <View style={s.presence}>
          {Array.from({ length: Math.min(participantCount, 5) }).map((_, i) => (
            <View key={i} style={[s.miniAvatar, { backgroundColor: ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"][i % 5], marginLeft: i > 0 ? -10 : 0 }]}>
              <Text style={s.miniAvatarText}>{String.fromCharCode(65 + i)}</Text>
            </View>
          ))}
          <Text style={s.presenceText}>
            {participantCount} {participantCount === 1 ? "student" : "students"}
          </Text>
        </View>

        {/* Mode tabs */}
        <View style={s.modeSwitcher}>
          {(["whiteboard", "participants", "chat", "call"] as Mode[]).map((m) => (
            <TouchableOpacity key={m} style={[s.modeTab, mode === m && s.modeTabActive]} onPress={() => setMode(m)} activeOpacity={0.7}>
              <Feather
                name={m === "whiteboard" ? "edit-3" : m === "participants" ? "users" : m === "chat" ? "message-circle" : "phone"}
                size={14}
                color={mode === m ? "#fff" : "#666"}
              />
              <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
                {m === "whiteboard" ? "Board" : m === "participants" ? "Students" : m === "chat" ? `Chat${messages.length > 0 ? ` (${messages.length})` : ""}` : "Call"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content area — whiteboard/participants/chat switch, call is a persistent overlay */}
        <View style={s.contentArea}>
        {/* Whiteboard */}
        {mode === "whiteboard" && (
          <View style={s.whiteboardArea}>
            <View style={s.canvas} {...panResponder.panHandlers}>
              {material?.kind === "image" && (
                <Image source={{ uri: material.dataUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
              )}
              {material?.kind === "pdf" && Platform.OS === "web" &&
                React.createElement("iframe", {
                  src: material.dataUrl,
                  style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", borderRadius: 12, pointerEvents: "none" },
                })}
              <Svg style={StyleSheet.absoluteFill}>
                {paths.map((p, i) => (
                  <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {currentPath ? (
                  <Path d={currentPath} stroke={isEraser ? "#FFFFFF" : penColor} strokeWidth={isEraser ? 24 : penSize} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
              </Svg>
            </View>
            <View style={s.tools}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.toolsInner}>
                {COLORS_PALETTE.map((c) => (
                  <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c, borderColor: c === "#FFFFFF" ? "#555" : c, borderWidth: penColor === c && !isEraser ? 3 : 1, transform: [{ scale: penColor === c && !isEraser ? 1.3 : 1 }] }]} onPress={() => { setPenColor(c); setIsEraser(false); }} activeOpacity={0.7} />
                ))}
                <View style={s.toolDivider} />
                {PEN_SIZES.map((sz) => (
                  <TouchableOpacity key={sz} style={[s.sizeBtn, penSize === sz && !isEraser && { borderColor: colors.primary }]} onPress={() => { setPenSize(sz); setIsEraser(false); }} activeOpacity={0.7}>
                    <View style={{ width: sz * 2, height: sz * 2, borderRadius: sz, backgroundColor: "#fff" }} />
                  </TouchableOpacity>
                ))}
                <View style={s.toolDivider} />
                <TouchableOpacity style={[s.toolIconBtn, isEraser && { backgroundColor: "#333" }]} onPress={() => setIsEraser(!isEraser)} activeOpacity={0.7}>
                  <Feather name="delete" size={17} color={isEraser ? "#fff" : "#999"} />
                </TouchableOpacity>
                <TouchableOpacity style={s.toolIconBtn} onPress={clearBoard} activeOpacity={0.7}>
                  <Feather name="trash-2" size={17} color="#999" />
                </TouchableOpacity>
                <View style={s.toolDivider} />
                <TouchableOpacity style={s.uploadBtn} onPress={handleUploadMaterial} activeOpacity={0.7}>
                  <Feather name="upload" size={14} color="#fff" />
                  <Text style={s.uploadBtnText}>Upload Material</Text>
                </TouchableOpacity>
                {material && (
                  <TouchableOpacity style={s.toolIconBtn} onPress={clearMaterial} activeOpacity={0.7}>
                    <Feather name="image" size={17} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
            {/* Reactions bar on whiteboard */}
            <View style={s.reactionsBar}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity key={emoji} style={s.reactionBtn} onPress={() => sendReaction(emoji)} activeOpacity={0.7}>
                  <Text style={s.reactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Participants */}
        {mode === "participants" && (
          <ScrollView style={s.flex} contentContainerStyle={s.participantGrid}>
            {Array.from({ length: Math.max(participantCount, 1) }).map((_, i) => {
              const names = ["Aarav S.", "Sita G.", "Ramesh K.", "Puja R.", "Bikash T.", "Anita B.", "Dinesh M.", "Kamala R."];
              const nm = names[i % names.length];
              const active = i % 5 !== 4;
              return (
                <View key={i} style={s.participantCard}>
                  <View style={[s.bigAvatar, { backgroundColor: active ? "#1A365D" : "#333" }]}>
                    <Text style={s.bigAvatarText}>{nm.split(" ").map((n) => n[0]).join("")}</Text>
                    {!active && <View style={s.inactiveOverlay}><Feather name="video-off" size={16} color="#666" /></View>}
                  </View>
                  <Text style={s.participantName} numberOfLines={1}>{nm.split(" ")[0]}</Text>
                  <View style={[s.statusDot, { backgroundColor: active ? "#22C55E" : "#555" }]} />
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Chat */}
        {mode === "chat" && (
          <View style={[s.flex, { paddingBottom: 0 }]}>
            <ScrollView ref={chatScrollRef} style={s.flex} contentContainerStyle={s.chatMessages} onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}>
              {messages.length === 0 && (
                <Text style={s.emptyChat}>No messages yet. Students will appear here.</Text>
              )}
              {messages.map((msg) => (
                <View key={msg.id} style={[s.chatBubble, msg.isMe && s.chatBubbleMe]}>
                  {!msg.isMe && <Text style={s.chatSender}>{msg.senderName}</Text>}
                  <View style={[s.bubbleContent, { backgroundColor: msg.isMe ? colors.primary : "#1E1E1E" }]}>
                    <Text style={s.chatText}>{msg.text}</Text>
                  </View>
                  <Text style={s.chatTime}>{msg.time}</Text>
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
            <View style={[s.chatInputRow, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput style={s.chatInputField} value={chatMsg} onChangeText={setChatMsg} placeholder="Message students..." placeholderTextColor="#555" onSubmitEditing={sendMessage} returnKeyType="send" testID="chat-input" />
              <TouchableOpacity style={[s.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage} activeOpacity={0.8}>
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Call — persistently mounted so it never reconnects when switching tabs.
            Shown fullscreen on the Call tab, or as a floating PiP over the whiteboard otherwise. */}
        <View style={mode === "call" ? s.jitsiFull : s.jitsiPip} pointerEvents="box-none">
          <JitsiEmbed roomName={roomName} displayName={teacherName} style={StyleSheet.absoluteFill} />
          {mode !== "call" && (
            <TouchableOpacity style={s.pipExpand} onPress={() => setMode("call")} activeOpacity={0.8}>
              <Feather name="maximize-2" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        </View>

        {/* Floating reactions overlay */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {floatingReactions.map((r) => (
            <Animated.View
              key={r.id}
              style={{
                position: "absolute",
                bottom: 200,
                left: r.x * SCREEN_W,
                opacity: r.opacity,
                transform: [{ translateY: r.translateY }],
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 34 }}>{r.emoji}</Text>
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  timer: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#999" },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  recBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  recText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  endBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, backgroundColor: "#1A1A1A", paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: "#EF4444" },
  endBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
  presence: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 6 },
  miniAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0A0A0A" },
  miniAvatarText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#fff" },
  presenceText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#888" },
  modeSwitcher: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 8, gap: 6 },
  modeTab: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#1A1A1A" },
  modeTabActive: { backgroundColor: "#2A2A2A" },
  modeTabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#666" },
  modeTabTextActive: { color: "#fff" },
  whiteboardArea: { flex: 1 },
  canvas: { flex: 1, backgroundColor: "#FFFFFF", marginHorizontal: 12, marginTop: 4, borderRadius: 12 },
  tools: { backgroundColor: "#111", paddingVertical: 7 },
  toolsInner: { paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 7 },
  colorDot: { width: 26, height: 26, borderRadius: 13 },
  toolDivider: { width: 1, height: 26, backgroundColor: "#333", marginHorizontal: 2 },
  sizeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#333" },
  toolIconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 17, backgroundColor: "#2A2A2A", paddingHorizontal: 12, height: 34 },
  uploadBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  reactionsBar: { flexDirection: "row", justifyContent: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#0D0D0D" },
  reactionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  reactionEmoji: { fontSize: 20 },
  participantGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12, justifyContent: "center" },
  participantCard: { width: (SCREEN_W - 64) / 3, alignItems: "center", gap: 6 },
  bigAvatar: { width: 76, height: 76, borderRadius: 12, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  bigAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  inactiveOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "#00000080" },
  participantName: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#ccc" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  chatMessages: { padding: 14, gap: 10 },
  emptyChat: { textAlign: "center", color: "#555", fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 40 },
  chatBubble: { gap: 3, maxWidth: "80%" },
  chatBubbleMe: { alignSelf: "flex-end", alignItems: "flex-end" },
  chatSender: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#666", marginLeft: 4 },
  bubbleContent: { borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  chatText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff" },
  chatTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555" },
  chatInputRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#1A1A1A" },
  chatInputField: { flex: 1, backgroundColor: "#1A1A1A", borderRadius: 24, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff", outlineStyle: "none" } as object,
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
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
