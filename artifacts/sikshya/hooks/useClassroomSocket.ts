import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform } from "react-native";
import { getToken } from "@/utils/api";

export interface ChatMessage {
  id: string;
  senderName: string;
  role: "teacher" | "student";
  text: string;
  time: string;
  isMe: boolean;
}

export type DrawTool = "pen" | "line" | "arrow" | "circle" | "text";

export interface DrawPath {
  tool: DrawTool;
  color: string;
  width: number;
  d?: string;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  cx?: number;
  cy?: number;
  r?: number;
  text?: string;
  x?: number;
  y?: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  senderName: string;
  opacity: Animated.Value;
  translateY: Animated.Value;
  x: number;
}

export interface BoardMaterial {
  kind: "image" | "pdf";
  dataUrl: string;
}

function getWsUrl(sessionId: string, token: string, name: string): string {
  const params = new URLSearchParams({ sessionId, token, name });
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `wss://${domain}/api/ws?${params.toString()}`;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${window.location.host}/api/ws?${params.toString()}`;
  }
  return `ws://localhost:80/api/ws?${params.toString()}`;
}

interface Options {
  sessionId: string;
  name: string;
  role: "teacher" | "student";
}

interface Result {
  connected: boolean;
  presenceCount: number;
  messages: ChatMessage[];
  remotePaths: DrawPath[];
  floatingReactions: FloatingReaction[];
  material: BoardMaterial | null;
  sessionStatus: string | null;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  sendDrawCommit: (shape: DrawPath) => void;
  sendBoardClear: () => void;
  sendMaterial: (dataUrl: string, kind: "image" | "pdf") => void;
  clearMaterial: () => void;
}

export function useClassroomSocket({ sessionId, name, role }: Options): Result {
  const [connected, setConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remotePaths, setRemotePaths] = useState<DrawPath[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [material, setMaterial] = useState<BoardMaterial | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const nameRef = useRef(name);
  const roleRef = useRef(role);
  nameRef.current = name;
  roleRef.current = role;

  const addFloating = useCallback((emoji: string, senderName: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const opacity = new Animated.Value(1);
    const translateY = new Animated.Value(0);
    const x = 0.05 + Math.random() * 0.65;
    const reaction: FloatingReaction = { id, emoji, senderName, opacity, translateY, x };
    setFloatingReactions((prev) => [...prev, reaction]);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 2500, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -130, duration: 2500, useNativeDriver: true }),
    ]).start(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    });
  }, []);

  const send = useCallback((data: object) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
  }, []);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;
    const token = await getToken();
    if (!token) return;

    const url = getWsUrl(sessionId, token, nameRef.current);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setConnected(true);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(event.data as string) as Record<string, unknown>; } catch { return; }

      switch (msg.type) {
        case "chat":
          setMessages((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              senderName: msg.senderName as string,
              role: msg.role as "teacher" | "student",
              text: msg.text as string,
              time: msg.time as string,
              isMe: false,
            },
          ]);
          break;
        case "draw_commit":
          setRemotePaths((prev) => [
            ...prev,
            {
              tool: (msg.tool as DrawTool) ?? "pen",
              color: msg.color as string,
              width: msg.width as number,
              d: msg.d as string | undefined,
              x1: msg.x1 as number | undefined,
              y1: msg.y1 as number | undefined,
              x2: msg.x2 as number | undefined,
              y2: msg.y2 as number | undefined,
              cx: msg.cx as number | undefined,
              cy: msg.cy as number | undefined,
              r: msg.r as number | undefined,
              text: msg.text as string | undefined,
              x: msg.x as number | undefined,
              y: msg.y as number | undefined,
            },
          ]);
          break;
        case "board_clear":
          setRemotePaths([]);
          break;
        case "presence":
          setPresenceCount(msg.count as number);
          break;
        case "reaction":
          addFloating(msg.emoji as string, msg.senderName as string);
          break;
        case "material_set":
          setMaterial({ kind: msg.kind as "image" | "pdf", dataUrl: msg.dataUrl as string });
          break;
        case "material_clear":
          setMaterial(null);
          break;
        case "session_status":
          setSessionStatus(msg.status as string);
          break;
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      reconnTimerRef.current = setTimeout(() => { void connect(); }, 3000);
    };

    ws.onerror = () => { ws.close(); };
  }, [sessionId, addFloating]);

  useEffect(() => {
    mountedRef.current = true;
    void connect();
    return () => {
      mountedRef.current = false;
      if (reconnTimerRef.current) clearTimeout(reconnTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendChat = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}`,
          senderName: nameRef.current,
          role: roleRef.current,
          text,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isMe: true,
        },
      ]);
      send({ type: "chat", text });
    },
    [send],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      addFloating(emoji, nameRef.current);
      send({ type: "reaction", emoji });
    },
    [addFloating, send],
  );

  const sendDrawCommit = useCallback(
    (shape: DrawPath) => send({ type: "draw_commit", ...shape }),
    [send],
  );

  const sendBoardClear = useCallback(() => send({ type: "board_clear" }), [send]);

  const sendMaterial = useCallback(
    (dataUrl: string, kind: "image" | "pdf") => {
      setMaterial({ dataUrl, kind });
      send({ type: "material_set", dataUrl, kind });
    },
    [send],
  );

  const clearMaterial = useCallback(() => {
    setMaterial(null);
    send({ type: "material_clear" });
  }, [send]);

  return {
    connected,
    presenceCount,
    messages,
    remotePaths,
    floatingReactions,
    material,
    sessionStatus,
    sendChat,
    sendReaction,
    sendDrawCommit,
    sendBoardClear,
    sendMaterial,
    clearMaterial,
  };
}
