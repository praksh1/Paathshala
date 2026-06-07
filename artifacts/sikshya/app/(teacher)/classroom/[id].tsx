import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

type Mode = "whiteboard" | "participants" | "chat";

interface DrawPath {
  d: string;
  color: string;
  width: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isTeacher: boolean;
}

const COLORS_PALETTE = ["#0D0D0D", "#C41E3A", "#1A365D", "#16A34A", "#F5A623", "#8B5CF6", "#FFFFFF"];
const PEN_SIZES = [3, 6, 10];

const PARTICIPANTS = [
  { id: "p1", name: "Aarav Shrestha", active: true },
  { id: "p2", name: "Sita Gurung", active: true },
  { id: "p3", name: "Ramesh Karki", active: true },
  { id: "p4", name: "Puja Rai", active: true },
  { id: "p5", name: "Bikash Tamang", active: false },
  { id: "p6", name: "Anita Basnet", active: true },
];

const INITIAL_CHAT: ChatMessage[] = [
  { id: "c1", sender: "Aarav", text: "Good afternoon sir!", time: "3:01 PM", isTeacher: false },
  { id: "c2", sender: "Sita", text: "Ready to learn!", time: "3:02 PM", isTeacher: false },
];

export default function Classroom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>("whiteboard");
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [penColor, setPenColor] = useState("#0D0D0D");
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [chatMsg, setChatMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<View>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
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
        setPaths((prev) => [
          ...prev,
          { d: currentPath, color: isEraser ? "#FFFFFF" : penColor, width: isEraser ? 24 : penSize },
        ]);
        setCurrentPath("");
      }
    },
  });

  const toggleRecording = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isRecording) {
      Alert.alert("Recording Started", "This session is now being recorded. Copyright belongs to Sikshya.");
    } else {
      Alert.alert("Recording Saved", "Session recording has been uploaded to Sikshya cloud storage.");
    }
    setIsRecording(!isRecording);
  };

  const leaveSession = () => {
    Alert.alert("Leave Session?", "Students will remain in the session.", [
      { text: "Cancel", style: "cancel" },
      { text: "End Session", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: "You (Teacher)",
      text: chatMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isTeacher: true,
    };
    setChat((prev) => [...prev, msg]);
    setChatMsg("");
  };

  return (
    <View style={[styles.container, { backgroundColor: "#0A0A0A", paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Live Session</Text>
            <Text style={styles.timer}>{formatTime(elapsed)}/60:00</Text>
          </View>
          <View style={[styles.liveTag, { backgroundColor: colors.primary }]}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.recBtn, { backgroundColor: isRecording ? colors.destructive : "#333" }]}
            onPress={toggleRecording}
            activeOpacity={0.8}
          >
            <Feather name="circle" size={14} color="#fff" />
            <Text style={styles.recText}>{isRecording ? "Stop" : "Rec"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.leaveBtn} onPress={leaveSession} activeOpacity={0.8}>
            <Feather name="phone-off" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Participants count */}
      <View style={styles.participants}>
        <View style={styles.participantIcons}>
          {PARTICIPANTS.slice(0, 5).map((p, i) => (
            <View
              key={p.id}
              style={[styles.miniAvatar, { backgroundColor: ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"][i % 5], marginLeft: i > 0 ? -10 : 0 }]}
            >
              <Text style={styles.miniAvatarText}>{p.name[0]}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.participantCount}>{PARTICIPANTS.length} students</Text>
      </View>

      {/* Mode switcher */}
      <View style={styles.modeSwitcher}>
        {(["whiteboard", "participants", "chat"] as Mode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeTab, mode === m && styles.modeTabActive]}
            onPress={() => setMode(m)}
            activeOpacity={0.7}
          >
            <Feather
              name={m === "whiteboard" ? "edit-3" : m === "participants" ? "users" : "message-circle"}
              size={16}
              color={mode === m ? "#fff" : "#666"}
            />
            <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
              {m === "whiteboard" ? "Board" : m === "participants" ? "Students" : "Chat"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main content area */}
      {mode === "whiteboard" && (
        <View style={styles.whiteboardArea}>
          <View
            ref={svgRef}
            style={styles.canvas}
            {...panResponder.panHandlers}
          >
            <Svg style={StyleSheet.absoluteFill}>
              {paths.map((p, i) => (
                <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {currentPath ? (
                <Path d={currentPath} stroke={isEraser ? "#FFFFFF" : penColor} strokeWidth={isEraser ? 24 : penSize} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
            </Svg>
          </View>

          {/* Tools */}
          <View style={styles.tools}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsInner}>
              {COLORS_PALETTE.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c, borderColor: c === "#FFFFFF" ? "#555" : c, borderWidth: penColor === c && !isEraser ? 3 : 1, transform: [{ scale: penColor === c && !isEraser ? 1.3 : 1 }] }]}
                  onPress={() => { setPenColor(c); setIsEraser(false); }}
                  activeOpacity={0.7}
                />
              ))}
              <View style={styles.toolDivider} />
              {PEN_SIZES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sizeBtn, penSize === s && !isEraser && { borderColor: colors.primary }]}
                  onPress={() => { setPenSize(s); setIsEraser(false); }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: s * 2, height: s * 2, borderRadius: s, backgroundColor: "#fff" }} />
                </TouchableOpacity>
              ))}
              <View style={styles.toolDivider} />
              <TouchableOpacity
                style={[styles.toolIconBtn, isEraser && { backgroundColor: "#333" }]}
                onPress={() => setIsEraser(!isEraser)}
                activeOpacity={0.7}
              >
                <Feather name="delete" size={18} color={isEraser ? "#fff" : "#999"} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.toolIconBtn}
                onPress={() => { setPaths([]); setCurrentPath(""); }}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={18} color="#999" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {mode === "participants" && (
        <ScrollView style={styles.flex} contentContainerStyle={styles.participantGrid}>
          {PARTICIPANTS.map((p) => (
            <View key={p.id} style={styles.participantCard}>
              <View style={[styles.bigAvatar, { backgroundColor: p.active ? "#1A365D" : "#333" }]}>
                <Text style={styles.bigAvatarText}>{p.name.split(" ").map((n) => n[0]).join("")}</Text>
                {!p.active && <View style={styles.inactiveOverlay}><Feather name="video-off" size={16} color="#666" /></View>}
              </View>
              <Text style={styles.participantName} numberOfLines={1}>{p.name.split(" ")[0]}</Text>
              <View style={[styles.statusDot2, { backgroundColor: p.active ? "#22C55E" : "#555" }]} />
            </View>
          ))}
        </ScrollView>
      )}

      {mode === "chat" && (
        <View style={[styles.flex, styles.chatArea]}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.chatMessages}>
            {chat.map((msg) => (
              <View key={msg.id} style={[styles.chatBubble, msg.isTeacher && styles.chatBubbleTeacher]}>
                {!msg.isTeacher && <Text style={styles.chatSender}>{msg.sender}</Text>}
                <View style={[styles.bubbleContent, { backgroundColor: msg.isTeacher ? colors.primary : "#1E1E1E" }]}>
                  <Text style={styles.chatText}>{msg.text}</Text>
                </View>
                <Text style={styles.chatTime}>{msg.time}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={[styles.chatInput, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.chatInputInner}>
              <Feather name="message-circle" size={18} color="#666" />
              <Text
                style={styles.chatPlaceholder}
                onPress={() => Alert.alert("Chat", "Type a message to broadcast to all students")}
              >
                {chatMsg || "Message students..."}
              </Text>
            </View>
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={sendChat} activeOpacity={0.8}>
              <Feather name="send" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sessionInfo: {},
  sessionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  timer: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#999" },
  liveTag: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  liveText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  recBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  recText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  leaveBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  participants: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  participantIcons: { flexDirection: "row" },
  miniAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0A0A0A" },
  miniAvatarText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff" },
  participantCount: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#999" },
  modeSwitcher: { flexDirection: "row", paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  modeTab: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#1A1A1A" },
  modeTabActive: { backgroundColor: "#2A2A2A" },
  modeTabText: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#666" },
  modeTabTextActive: { color: "#fff" },
  whiteboardArea: { flex: 1, flexDirection: "column" },
  canvas: { flex: 1, backgroundColor: "#FFFFFF", margin: 12, borderRadius: 12 },
  tools: { backgroundColor: "#111", paddingVertical: 8 },
  toolsInner: { paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  toolDivider: { width: 1, height: 28, backgroundColor: "#333", marginHorizontal: 4 },
  sizeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center", borderWidth: 1.5, borderColor: "#333" },
  toolIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  participantGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12, justifyContent: "center" },
  participantCard: { width: (SCREEN_W - 64) / 3, alignItems: "center", gap: 6 },
  bigAvatar: { width: 80, height: 80, borderRadius: 12, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  bigAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  inactiveOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backgroundColor: "#00000080" },
  participantName: { fontSize: 12, fontFamily: "Inter_500Medium", color: "#ccc" },
  statusDot2: { width: 8, height: 8, borderRadius: 4 },
  chatArea: { paddingBottom: 0 },
  chatMessages: { padding: 16, gap: 12 },
  chatBubble: { gap: 4, maxWidth: "80%" },
  chatBubbleTeacher: { alignSelf: "flex-end", alignItems: "flex-end" },
  chatSender: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#666", marginLeft: 4 },
  bubbleContent: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  chatText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff" },
  chatTime: { fontSize: 10, fontFamily: "Inter_400Regular", color: "#555" },
  chatInput: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#1A1A1A" },
  chatInputInner: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#1A1A1A", borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12 },
  chatPlaceholder: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#555" },
  sendBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
});
