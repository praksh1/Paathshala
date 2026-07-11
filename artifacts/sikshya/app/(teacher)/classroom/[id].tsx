import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ScreenOrientation from "expo-screen-orientation";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Path, Line, Circle, Text as SvgText, Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { Teacher } from "@/context/AuthContext";
import { apiGet, apiPatch } from "@/utils/api";
import { useClassroomSocket, type DrawPath, type DrawTool } from "@/hooks/useClassroomSocket";
import DailyEmbed from "@/components/DailyEmbed";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import PdfViewer from "@/components/PdfViewer";

const SCREEN_W = Dimensions.get("window").width;
type Mode = "whiteboard" | "participants" | "chat";

const COLORS_PALETTE = ["#0D0D0D", "#C41E3A", "#1A365D", "#16A34A", "#F5A623", "#8B5CF6", "#FFFFFF"];
const PEN_SIZES = [3, 6, 10];

const TOOLS: { id: DrawTool; icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { id: "pen", icon: "edit-3", label: "Pen" },
  { id: "line", icon: "minus", label: "Line" },
  { id: "arrow", icon: "arrow-up-right", label: "Arrow" },
  { id: "circle", icon: "circle", label: "Circle" },
  { id: "text", icon: "type", label: "Text" },
];

function renderShape(p: DrawPath, i: number) {
  switch (p.tool) {
    case "line":
      return <Line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke={p.color} strokeWidth={p.width} strokeLinecap="round" />;
    case "arrow": {
      const x1 = p.x1 ?? 0, y1 = p.y1 ?? 0, x2 = p.x2 ?? 0, y2 = p.y2 ?? 0;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = Math.max(10, p.width * 3);
      const p1x = x2 - headLen * Math.cos(angle - Math.PI / 7);
      const p1y = y2 - headLen * Math.sin(angle - Math.PI / 7);
      const p2x = x2 - headLen * Math.cos(angle + Math.PI / 7);
      const p2y = y2 - headLen * Math.sin(angle + Math.PI / 7);
      return (
        <React.Fragment key={i}>
          <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={p.color} strokeWidth={p.width} strokeLinecap="round" />
          <Polygon points={`${x2},${y2} ${p1x},${p1y} ${p2x},${p2y}`} fill={p.color} />
        </React.Fragment>
      );
    }
    case "circle": {
      const cx = p.cx ?? 0, cy = p.cy ?? 0, r = p.r ?? 0;
      return <Circle key={i} cx={cx} cy={cy} r={r} stroke={p.color} strokeWidth={p.width} fill="none" />;
    }
    case "text":
      return (
        <SvgText key={i} x={p.x} y={p.y} fill={p.color} fontSize={Math.max(14, p.width * 6)} fontWeight="600">
          {p.text}
        </SvgText>
      );
    case "pen":
    default:
      return <Path key={i} d={p.d} stroke={p.color} strokeWidth={p.width} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  }
}

interface SessionData {
  id: number; topic: string; subject: string; teacherName: string;
  duration: number; maxStudents: number; enrolledCount: number; status: string;
}


const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

export default function Classroom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const teacher = user as Teacher;
  if (!teacher || teacher.role !== "teacher") return null;

  const teacherName = teacher.name ?? "Teacher";

  const { connected, presenceCount, messages, material, sendChat, sendDrawCommit, sendBoardClear, sendMaterial, clearMaterial } =
    useClassroomSocket({ sessionId: id ?? "", name: teacherName, role: "teacher" });

  const [session, setSession] = useState<SessionData | null>(null);
  const [mode, setMode] = useState<Mode>("whiteboard");
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [tool, setTool] = useState<DrawTool>("pen");
  const [previewShape, setPreviewShape] = useState<DrawPath | null>(null);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textInputValue, setTextInputValue] = useState("");
  const pendingTextPoint = useRef<{ x: number; y: number } | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const [penColor, setPenColor] = useState("#0D0D0D");
  const [penSize, setPenSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [chatMsg, setChatMsg] = useState("");
  const [isLandscape, setIsLandscape] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  // Native-only: stores a local file:// URI for a PDF picked via DocumentPicker.
  // Kept separate from `material` (which is broadcast over the socket) because
  // file:// paths are device-local and meaningless on other participants' devices.
  const [localPdfUri, setLocalPdfUri] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [roomError, setRoomError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const canvasRef = useRef<View>(null);

  useEffect(() => {
    loadSession();
    loadRoom();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [id]);

  const loadSession = async () => {
    try { setSession(await apiGet<SessionData>(`/sessions/${id}`)); } catch {}
  };

  // Daily.co rooms must be created server-side via their REST API before anyone can
  // join them — the client can no longer just guess a room URL and connect to it.
  const loadRoom = async () => {
    try {
      const { roomUrl: url } = await apiGet<{ roomUrl: string }>(`/sessions/${id}/room`);
      setRoomUrl(url);
      setRoomError(false);
    } catch {
      setRoomError(true);
    }
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

  const handleGestureStart = useCallback(
    (x: number, y: number) => {
      const color = isEraser ? "#FFFFFF" : penColor;
      const width = isEraser ? 24 : penSize;

      if (tool === "pen") {
        setCurrentPath(`M${x.toFixed(1)},${y.toFixed(1)}`);
        return;
      }
      if (tool === "text") {
        pendingTextPoint.current = { x, y };
        setTextInputValue("");
        setTextModalVisible(true);
        return;
      }
      startPoint.current = { x, y };
      if (tool === "line" || tool === "arrow") {
        setPreviewShape({ tool, color, width, x1: x, y1: y, x2: x, y2: y });
      } else if (tool === "circle") {
        setPreviewShape({ tool, color, width, cx: x, cy: y, r: 0 });
      }
    },
    [tool, isEraser, penColor, penSize],
  );

  const handleGestureMove = useCallback(
    (x: number, y: number) => {
      if (tool === "pen") {
        setCurrentPath((p) => (p ? `${p} L${x.toFixed(1)},${y.toFixed(1)}` : p));
        return;
      }
      const start = startPoint.current;
      if (!start) return;
      if (tool === "line" || tool === "arrow") {
        setPreviewShape((prev) => (prev ? { ...prev, x2: x, y2: y } : prev));
      } else if (tool === "circle") {
        const r = Math.hypot(x - start.x, y - start.y);
        setPreviewShape((prev) => (prev ? { ...prev, r } : prev));
      }
    },
    [tool],
  );

  const handleGestureEnd = useCallback(() => {
    if (tool === "pen") {
      if (currentPath) {
        const color = isEraser ? "#FFFFFF" : penColor;
        const width = isEraser ? 24 : penSize;
        const shape: DrawPath = { tool: "pen", d: currentPath, color, width };
        setPaths((prev) => [...prev, shape]);
        sendDrawCommit(shape);
        setCurrentPath("");
      }
      return;
    }
    if (previewShape) {
      setPaths((prev) => [...prev, previewShape]);
      sendDrawCommit(previewShape);
      setPreviewShape(null);
    }
    startPoint.current = null;
  }, [tool, currentPath, isEraser, penColor, penSize, previewShape, sendDrawCommit]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      handleGestureStart(locationX, locationY);
    },
    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      handleGestureMove(locationX, locationY);
    },
    onPanResponderRelease: handleGestureEnd,
  });

  const extractTouchPoint = (e: GestureResponderEvent): { x: number; y: number } | null => {
    const touch = e.nativeEvent.touches?.[0] ?? e.nativeEvent;
    if (touch == null) return null;
    return { x: touch.locationX, y: touch.locationY };
  };

  const onTouchStart = (e: GestureResponderEvent) => {
    const pt = extractTouchPoint(e);
    if (pt) handleGestureStart(pt.x, pt.y);
  };
  const onTouchMove = (e: GestureResponderEvent) => {
    const pt = extractTouchPoint(e);
    if (pt) handleGestureMove(pt.x, pt.y);
  };
  const onTouchEnd = () => handleGestureEnd();

  const confirmTextShape = () => {
    const point = pendingTextPoint.current;
    const value = textInputValue.trim();
    setTextModalVisible(false);
    if (point && value) {
      const shape: DrawPath = { tool: "text", text: value, x: point.x, y: point.y, color: penColor, width: penSize };
      setPaths((prev) => [...prev, shape]);
      sendDrawCommit(shape);
    }
    pendingTextPoint.current = null;
    setTextInputValue("");
  };

  const clearBoard = () => {
    setPaths([]);
    setCurrentPath("");
    setPreviewShape(null);
    sendBoardClear();
  };

  const applyUploadedFile = (dataUrl: string, kind: "image" | "pdf") => {
    if (kind === "pdf") {
      if (Platform.OS === "web") {
        // On web: the dataUrl is a full base64 data URI. Feed it straight to an
        // <iframe> via the socket so all web participants see it in the browser's
        // native PDF renderer — no pdf.js canvas rasterization, no off-screen
        // canvas allocation, no memory pressure on the mobile main thread.
        sendMaterial(dataUrl, "pdf");
      } else {
        // On native: dataUrl is a device-local file:// URI from DocumentPicker.
        // Show it locally in a WebView; don't broadcast since file paths are
        // meaningless on other participants' devices.
        setLocalPdfUri(dataUrl);
      }
      return;
    }
    sendMaterial(dataUrl, kind);
  };

  const handleWebFileSelected = (file: File) => {
    const kind: "image" | "pdf" = file.type === "application/pdf" ? "pdf" : "image";
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      applyUploadedFile(dataUrl, kind);
    };
    reader.readAsDataURL(file);
  };

  // Split into two distinct pickers: iOS's WKWebView file input only offers the Photo
  // Library picker when `accept` is scoped to images alone — mixing in `application/pdf`
  // forces iOS to fall back to the Files app for both. Two separate inputs/buttons let each
  // one open the picker the user actually expects (Photo Library vs Files).
  const handleUploadPhoto = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        handleWebFileSelected(file);
      };
      input.click();
      return;
    }

    // Use the native Expo image picker (UIImagePickerController) instead of the generic
    // document picker — on iOS, DocumentPicker's "image" file type still routes through
    // the Files app browser rather than the Photo Library, which is not what users expect
    // from an "Upload Photo" button. expo-image-picker opens the actual Photo Library.
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Needed", "Photo Library access is required to upload a photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      applyUploadedFile(result.assets[0].uri, "image");
    } catch {
      Alert.alert("Upload Failed", "Could not upload the photo. Please try again.");
    }
  };

  const handleUploadPdf = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        handleWebFileSelected(file);
      };
      input.click();
      return;
    }

    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        copyToCacheDirectory: true,
      });
      if (doc.canceled || !doc.assets?.[0]) return;
      const asset = doc.assets[0];
      applyUploadedFile(asset.uri, "pdf");
    } catch {
      Alert.alert("Upload Failed", "Could not upload the PDF. Please try again.");
    }
  };

  const toggleRecording = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const msg = !isRecording ? "Recording started." : "Recording saved to Sikshya cloud.";
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert(!isRecording ? "Recording Started" : "Recording Saved", msg);
    setIsRecording((r) => !r);
  };

  // Called when the teacher clicks Daily's native Leave button. No confirmation dialog
  // here — the user already made an explicit in-call gesture, so we just clean up
  // immediately: mark the session completed and return to the dashboard.
  const handleDailyLeft = useCallback(async () => {
    try { await apiPatch(`/sessions/${id}`, { status: "completed" }); } catch {}
    router.back();
  }, [id]);

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

  // Presence (from the live WebSocket room) is the source of truth once connected — it
  // starts at 0 the moment the teacher starts the session (server force-clears any stale
  // "ghost" entries on start). Falling back to enrolledCount before the socket connects
  // caused a stale avatar/count to render even when nobody is actually present.
  const participantCount = connected ? presenceCount : 0;

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

        {/* Presence — do not render avatar bubbles or an "active" count at all when
            nobody is actually present, so a ghost participant never shows up. */}
        {participantCount > 0 && (
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
        )}

        {/* Mode tabs */}
        <View style={s.modeSwitcher}>
          {(["whiteboard", "participants", "chat"] as Mode[]).map((m) => (
            <TouchableOpacity key={m} style={[s.modeTab, mode === m && s.modeTabActive]} onPress={() => setMode(m)} activeOpacity={0.7}>
              <Feather
                name={m === "whiteboard" ? "edit-3" : m === "participants" ? "users" : "message-circle"}
                size={14}
                color={mode === m ? "#fff" : "#666"}
              />
              <Text style={[s.modeTabText, mode === m && s.modeTabTextActive]}>
                {m === "whiteboard" ? "Board" : m === "participants" ? "Students" : `Chat${messages.length > 0 ? ` (${messages.length})` : ""}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content area — unified flexbox: video feed confined on top, board/chat/participants on bottom.
            Video is persistently mounted so it never reconnects when switching tabs. */}
        <View style={s.contentArea}>
        {/* Video pane. Forced display:none (not just covered) while chatting — some mobile
            browsers break the embedded call out into a native Picture-in-Picture window that
            floats above all DOM content regardless of z-index, so removing it from layout
            is the only reliable way to keep it from clashing with the chat tab. */}
        <View style={[s.videoArea, videoExpanded && s.videoAreaExpanded, mode === "chat" && s.videoAreaHidden]}>
          {roomUrl ? (
            <DailyEmbed roomUrl={roomUrl} displayName={teacherName} style={StyleSheet.absoluteFill} onLeft={handleDailyLeft} />
          ) : (
            <View style={[StyleSheet.absoluteFill, s.permissionGate]}>
              <ActivityIndicator color="#fff" />
              <Text style={s.permissionGateText}>
                {roomError ? "Couldn't set up the video room." : "Setting up video room…"}
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.videoExpandBtn} onPress={() => setVideoExpanded((v) => !v)} activeOpacity={0.8}>
            <Feather name={videoExpanded ? "minimize-2" : "maximize-2"} size={13} color="#fff" />
          </TouchableOpacity>
        </View>
        {!videoExpanded && (
        <View style={s.boardArea}>
        {/* Whiteboard */}
        {mode === "whiteboard" && (
          <View style={s.whiteboardArea}>
            {/* Permanently docked upload button — always visible above the canvas, above the toolbar */}
            <View style={s.uploadDock}>
              {Platform.OS === "web" ? (
                <>
                  <View style={s.uploadDockBtnWrap}>
                    <Feather name="image" size={16} color="#fff" style={s.uploadDockIcon} pointerEvents="none" />
                    <Text style={s.uploadDockBtnText} pointerEvents="none">Upload Photo</Text>
                    {React.createElement("input", {
                      type: "file",
                      accept: "image/*",
                      onChange: (e: any) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleWebFileSelected(file);
                        e.target.value = "";
                      },
                      style: {
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                        zIndex: 9999,
                      },
                    })}
                  </View>
                  <View style={s.uploadDockBtnWrap}>
                    <Feather name="file-text" size={16} color="#fff" style={s.uploadDockIcon} pointerEvents="none" />
                    <Text style={s.uploadDockBtnText} pointerEvents="none">Upload PDF</Text>
                    {React.createElement("input", {
                      type: "file",
                      accept: "application/pdf",
                      onChange: (e: any) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleWebFileSelected(file);
                        e.target.value = "";
                      },
                      style: {
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                        zIndex: 9999,
                      },
                    })}
                  </View>
                </>
              ) : (
                <>
                  <TouchableOpacity style={s.uploadDockBtnWrap} onPress={handleUploadPhoto} activeOpacity={0.8}>
                    <Feather name="image" size={16} color="#fff" style={s.uploadDockIcon} />
                    <Text style={s.uploadDockBtnText}>Upload Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.uploadDockBtnWrap} onPress={handleUploadPdf} activeOpacity={0.8}>
                    <Feather name="file-text" size={16} color="#fff" style={s.uploadDockIcon} />
                    <Text style={s.uploadDockBtnText}>Upload PDF</Text>
                  </TouchableOpacity>
                </>
              )}
              {(material || localPdfUri) && (
                <TouchableOpacity
                  style={s.uploadDockClear}
                  onPress={() => { clearMaterial(); setLocalPdfUri(null); }}
                  activeOpacity={0.7}
                >
                  <Feather name="x-circle" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            <View style={s.canvasScrollWrap}>
              {/* PDF mode: render the document in the platform's native PDF viewer.
                  No pdf.js, no off-screen canvas allocation, no main-thread rasterization.
                  - Web: <iframe> — Chrome/Safari's built-in PDF plugin renders it.
                  - Native: WebView with the local file:// URI picked by DocumentPicker. */}
              {(material?.kind === "pdf" || localPdfUri !== null) ? (
                Platform.OS === "web" && material?.kind === "pdf" ? (
                  React.createElement("iframe", {
                    src: material.dataUrl,
                    title: "PDF document",
                    style: {
                      position: "absolute",
                      top: 0, left: 0,
                      width: "100%", height: "100%",
                      border: "none",
                      borderRadius: 12,
                    },
                  })
                ) : localPdfUri !== null ? (
                  <PdfViewer uri={localPdfUri} style={StyleSheet.absoluteFill} />
                ) : null
              ) : (
                /* Drawing canvas — shown when material is an image overlay or board is blank */
                <>
                  <View
                    ref={canvasRef}
                    style={[s.canvas, { transform: [{ scale: zoom }] }]}
                    {...panResponder.panHandlers}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {material?.kind === "image" && (
                      <Image source={{ uri: material.dataUrl }} style={StyleSheet.absoluteFill} resizeMode="contain" />
                    )}
                    <Svg style={StyleSheet.absoluteFill}>
                      {paths.map((p, i) => renderShape(p, i))}
                      {currentPath ? (
                        <Path d={currentPath} stroke={isEraser ? "#FFFFFF" : penColor} strokeWidth={isEraser ? 24 : penSize} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      ) : null}
                      {previewShape ? renderShape(previewShape, -1) : null}
                    </Svg>
                  </View>

                  {/* Floating "island" toolbar — modern Miro/Freeform-style pill overlay.
                      Hidden in PDF mode since drawing on top of a document isn't supported. */}
                  <View style={s.island} pointerEvents="box-none">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.islandInner}>
                      {TOOLS.map((t) => (
                        <TouchableOpacity key={t.id} style={[s.islandBtn, tool === t.id && { backgroundColor: colors.primary }]} onPress={() => setTool(t.id)} activeOpacity={0.7}>
                          <Feather name={t.icon} size={16} color={tool === t.id ? "#fff" : "#333"} />
                        </TouchableOpacity>
                      ))}
                      <View style={s.islandDivider} />
                      {COLORS_PALETTE.map((c) => (
                        <TouchableOpacity key={c} style={[s.islandColorDot, { backgroundColor: c, borderColor: c === "#FFFFFF" ? "#CCC" : c, borderWidth: penColor === c && !isEraser ? 3 : 1, transform: [{ scale: penColor === c && !isEraser ? 1.15 : 1 }] }]} onPress={() => { setPenColor(c); setIsEraser(false); }} activeOpacity={0.7} />
                      ))}
                      <View style={s.islandDivider} />
                      {PEN_SIZES.map((sz) => (
                        <TouchableOpacity key={sz} style={[s.islandBtn, penSize === sz && !isEraser && { borderColor: colors.primary, borderWidth: 1.5 }]} onPress={() => { setPenSize(sz); setIsEraser(false); }} activeOpacity={0.7}>
                          <View style={{ width: sz * 1.6, height: sz * 1.6, borderRadius: sz, backgroundColor: "#333" }} />
                        </TouchableOpacity>
                      ))}
                      <View style={s.islandDivider} />
                      <TouchableOpacity style={[s.islandBtn, isEraser && { backgroundColor: "#EDEDED" }]} onPress={() => setIsEraser(!isEraser)} activeOpacity={0.7}>
                        <Feather name="delete" size={16} color="#333" />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.islandBtn} onPress={clearBoard} activeOpacity={0.7}>
                        <Feather name="trash-2" size={16} color="#333" />
                      </TouchableOpacity>
                      <View style={s.islandDivider} />
                      <TouchableOpacity style={s.islandBtn} onPress={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} activeOpacity={0.7}>
                        <Feather name="zoom-out" size={16} color="#333" />
                      </TouchableOpacity>
                      <Text style={s.islandZoomText}>{Math.round(zoom * 100)}%</Text>
                      <TouchableOpacity style={s.islandBtn} onPress={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} activeOpacity={0.7}>
                        <Feather name="zoom-in" size={16} color="#333" />
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Text tool input modal */}
        <Modal visible={textModalVisible} transparent animationType="fade" onRequestClose={() => setTextModalVisible(false)}>
          <View style={s.textModalOverlay}>
            <View style={s.textModalCard}>
              <Text style={s.textModalTitle}>Add Text</Text>
              <TextInput
                style={s.textModalInput}
                value={textInputValue}
                onChangeText={setTextInputValue}
                placeholder="Type text…"
                placeholderTextColor="#666"
                autoFocus
                onSubmitEditing={confirmTextShape}
              />
              <View style={s.textModalActions}>
                <TouchableOpacity style={s.textModalCancel} onPress={() => { setTextModalVisible(false); pendingTextPoint.current = null; }} activeOpacity={0.7}>
                  <Text style={s.textModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.textModalConfirm, { backgroundColor: colors.primary }]} onPress={confirmTextShape} activeOpacity={0.8}>
                  <Text style={s.textModalConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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

        {/* Chat — solid opaque background + high z-index so it fully covers the video pane
            if a mobile browser forces the call into a floating window regardless. */}
        {mode === "chat" && (
          <View style={[s.flex, s.chatCover, { paddingBottom: 0 }]}>
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
            <View style={[s.chatInputRow, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput style={s.chatInputField} value={chatMsg} onChangeText={setChatMsg} placeholder="Message students..." placeholderTextColor="#555" onSubmitEditing={sendMessage} returnKeyType="send" testID="chat-input" />
              <TouchableOpacity style={[s.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage} activeOpacity={0.8}>
                <Feather name="send" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        </View>
        )}
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
  canvasScrollWrap: {
    flex: 1, marginHorizontal: 12, marginTop: 4, borderRadius: 12,
    backgroundColor: "#FFFFFF", overflow: Platform.OS === "web" ? ("auto" as any) : "hidden",
    position: "relative",
  },
  canvas: { flex: 1, width: "100%", height: "100%", transformOrigin: "0 0" } as object,
  uploadDock: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4, zIndex: 50, position: "relative" },
  uploadDockBtnWrap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, backgroundColor: "#C41E3A", paddingVertical: 14, shadowColor: "#C41E3A", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6, position: "relative", overflow: "hidden", zIndex: 50, borderWidth: 1, borderColor: "#FF6B81" },
  uploadDockIcon: { zIndex: 51 },
  uploadDockBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff", zIndex: 51 },
  uploadDockClear: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" },
  island: {
    position: "absolute", left: 12, right: 12, bottom: 12, alignItems: "center", zIndex: 40,
  },
  islandInner: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 22,
    shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  islandBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3F3F3", justifyContent: "center", alignItems: "center" },
  islandDivider: { width: 1, height: 22, backgroundColor: "#E2E2E2", marginHorizontal: 2 },
  islandColorDot: { width: 24, height: 24, borderRadius: 12 },
  islandZoomText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#333", minWidth: 34, textAlign: "center" },
  textModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 24 },
  textModalCard: { width: "100%", maxWidth: 360, backgroundColor: "#1A1A1A", borderRadius: 16, padding: 18, gap: 14 },
  textModalTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  textModalInput: { backgroundColor: "#0D0D0D", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, fontFamily: "Inter_400Regular", color: "#fff", outlineStyle: "none" } as object,
  textModalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  textModalCancel: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  textModalCancelText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#999" },
  textModalConfirm: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  textModalConfirmText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
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
  contentArea: { flex: 1, flexDirection: "column" },
  videoArea: {
    flex: 1, backgroundColor: "#000", position: "relative",
    overflow: "hidden", borderBottomWidth: 1, borderBottomColor: "#1A1A1A",
  },
  videoAreaExpanded: { flex: 1 },
  videoAreaHidden: { display: "none" },
  permissionGate: { alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24 },
  permissionGateText: { color: "#ccc", fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  boardArea: { flex: 1, overflow: "hidden" },
  chatCover: { backgroundColor: "#0A0A0A", zIndex: 9999, position: "relative" },
  videoExpandBtn: {
    position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", zIndex: 5,
  },
});
