import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";

export default function TabsIndex() {
  const { user } = useAuth();
  if (user?.role === "teacher") return <Redirect href="/(teacher)" />;
  if (user?.role === "student") return <Redirect href="/(student)" />;
  return <Redirect href="/" />;
}
