import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../../store/useStore";
import { loadTokens } from "../../lib/api";
import { registerUser } from "../../lib/backend";
import { isValidEmail } from "../../lib/isValidEmail";
import CentifiLogo from "../../components/CentifiLogo";
import { useAppDialog } from "../../context/AppDialogContext";

export default function Register() {
  const { showAlert } = useAppDialog();
  const router = useRouter();
  const setUser = useStore((s) => s.setUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDark = useStore((s) => s.isDark);
  const bg = isDark ? "#0f0f0f" : "#f8f8f8";
  const cardBg = isDark ? "#1a1a1a" : "#ffffff";
  const borderColor = isDark ? "#2a2a2a" : "#e5e5e5";
  const textColor = isDark ? "#ffffff" : "#0f0f0f";
  const mutedColor = isDark ? "#888888" : "#666666";

  const handleRegister = async () => {
    if (!name || !email || !password) {
      showAlert("Error", "Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email)) {
      showAlert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      showAlert("Error", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await registerUser({ name, email, password });
      const result = await useStore.getState().hydrateFromBackend();
      if (result === "unreachable") {
        const tokensKept = await loadTokens();
        if (tokensKept) {
          showAlert(
            "Bağlantı / profil",
            "Hesap oluştu ama profil yüklenemedi. EXPO_PUBLIC_API_BASE_URL: üretim https://centifi-backend-production.up.railway.app · yerel telefon http://Mac_IP:8000",
          );
        }
      }
    } catch (e: any) {
      showAlert("Register Failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputRowBg = isDark ? "#111111" : "#f5f5f5";

  const Field = ({ label, value, onChange, placeholder, secure = false, keyboard = "default" as any, icon }: any) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: mutedColor, fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 }}>{label}</Text>
      <View style={{ backgroundColor: inputRowBg, borderRadius: 12, borderWidth: 1, borderColor, paddingHorizontal: 14, flexDirection: "row", alignItems: "center" }}>
        <Ionicons name={icon} size={18} color={mutedColor} style={{ marginRight: 10 }} />
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={mutedColor}
          secureTextEntry={secure && !showPass} keyboardType={keyboard} autoCapitalize="none" autoCorrect={false}
          style={{ flex: 1, color: textColor, fontSize: 16, paddingVertical: 14 }} />
        {secure && (
          <Pressable onPress={() => setShowPass(!showPass)} hitSlop={10}>
            <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={20} color={mutedColor} />
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >

          {/* Back */}
          <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: cardBg, alignItems: "center", justifyContent: "center", marginBottom: 32, borderWidth: 1, borderColor }}>
            <Ionicons name="chevron-back" size={20} color={mutedColor} />
          </Pressable>

          <View style={{ marginBottom: 36 }}>
            <View style={{ marginBottom: 28 }}>
              <CentifiLogo size={60} showName nameColor={textColor} />
            </View>
            <Text style={{ color: textColor, fontSize: 30, fontWeight: "800", letterSpacing: -0.8, marginBottom: 8 }}>Create account</Text>
            <Text style={{ color: mutedColor, fontSize: 16 }}>Start tracking your expenses</Text>
          </View>

          <View style={{ backgroundColor: cardBg, borderRadius: 20, borderWidth: 1, borderColor, padding: 20, marginBottom: 16 }}>
            <Field label="Full Name" value={name} onChange={setName} placeholder="Alex Johnson" icon="person-outline" />
            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" icon="mail-outline" keyboard="email-address" />
            <Field label="Password" value={password} onChange={setPassword} placeholder="Min. 6 characters" icon="lock-closed-outline" secure />
          </View>

          {/* Budget hint */}
          <View style={{ backgroundColor: "#6C63FF15", borderRadius: 14, padding: 14, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="information-circle-outline" size={18} color="#6C63FF" />
            <Text style={{ color: "#6C63FF", fontSize: 13, flex: 1, lineHeight: 18 }}>You can set your monthly budget after signing up.</Text>
          </View>

          <Pressable onPress={handleRegister} disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: "#6C63FF", borderRadius: 16, padding: 18,
              alignItems: "center", opacity: pressed || loading ? 0.8 : 1,
              shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4, shadowRadius: 16, elevation: 10, marginBottom: 28,
            })}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Create Account</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
            <Text style={{ color: mutedColor, fontSize: 14 }}>Already have an account?</Text>
            <Text style={{ color: "#6C63FF", fontSize: 14, fontWeight: "600" }}>Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
