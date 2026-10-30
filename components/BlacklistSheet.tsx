import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronRight } from "lucide-react-native";
import BlacklistIcon from "../assets/icons/carbon_disable-step.svg";
import { type BlacklistKind, useBlacklist } from "./BlacklistContext";
import BlacklistListPanel from "./BlacklistListPanel";

const LIME = "#C6E900";
const SLIDER_HEIGHT = 49;
const THUMB_WIDTH = 54;
const REASONS = ["Scam", "Sniper", "Bundler", "Insider", "Wash/Sybil", "Dump"];
type Props = { visible: boolean; onClose: () => void; onOpenList?: () => void };

export default function BlacklistSheet({ visible, onClose }: Props) {
  const [kind, setKind] = useState<BlacklistKind>("Wallet");
  const [address, setAddress] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [showList, setShowList] = useState(false);
  const { addEntry } = useBlacklist();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dragY = useRef(new Animated.Value(850)).current;
  const slideX = useRef(new Animated.Value(0)).current;
    const [trackWidth, setTrackWidth] = useState(0);
  const canSubmitRef = useRef(false);
  const submitRef = useRef<() => void>(() => {});
  const slideDistance = Math.max(0, trackWidth - THUMB_WIDTH);
  const sliderMaxRef = useRef(0);
  sliderMaxRef.current = slideDistance;

  const handlePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => dragY.setValue(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > 105 || g.vy > 1.1) {
        Animated.timing(dragY, { toValue: 850, duration: 200, useNativeDriver: true }).start(({ finished }) => {
          if (finished) closeRef.current();
        });
        return;
      }
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true, speed: 22, bounciness: 0 }).start();
    },
    onPanResponderTerminate: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start(),
  })).current;

  useEffect(() => {
    if (visible) {
      dragY.setValue(850);
      Animated.spring(dragY, { toValue: 0, speed: 18, bounciness: 0, useNativeDriver: true }).start();
    } else {
      setAddress(""); setReasons([]); setKind("Wallet"); setShowList(false);
      dragY.setValue(850);
      slideX.setValue(0);
    }
  }, [visible, dragY, slideX]);

  const canSubmit = address.trim().length >= 20 && reasons.length > 0;

  canSubmitRef.current = canSubmit;

  const resetSlider = () => Animated.spring(slideX, { toValue: 0, speed: 24, bounciness: 0, useNativeDriver: false }).start();
  const sliderPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 3,
    onPanResponderMove: (_, g) => {
      if (canSubmitRef.current) slideX.setValue(Math.max(0, Math.min(sliderMaxRef.current, g.dx)));
    },
    onPanResponderRelease: (_, g) => {
      const max = sliderMaxRef.current;
      if (canSubmitRef.current && max > 0 && g.dx >= max * 0.83) {
        Animated.timing(slideX, { toValue: max, duration: 110, useNativeDriver: false }).start(() => {
          submitRef.current();
          resetSlider();
        });
      } else resetSlider();
    },
    onPanResponderTerminate: () => resetSlider(),
  })).current;

  const submit = () => {
    if (!canSubmit) {
      Alert.alert("Incomplete entry", "Enter an address (at least 20 characters) and select a reason.");
      return;
    }
    const success = addEntry({ kind, address: address.trim(), reasons });
    if (!success) {
      Alert.alert("Already blacklisted", "This address is already on your private demo blacklist.");
      return;
    }
    onClose();
  };

  submitRef.current = submit;

  const toggleReason = (reason: string) => setReasons(previous => previous.includes(reason) ? previous.filter(item => item !== reason) : [...previous, reason]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => showList ? setShowList(false) : onClose()}>
      <View style={styles.overlay}>
        <BlurView tint="dark" intensity={32} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (showList) setShowList(false); else onClose(); }} accessibilityLabel="Dismiss blacklist sheet" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard} pointerEvents="box-none">
          <Animated.View style={[styles.sheet, { transform: [{ translateY: dragY }] }]}>
            <View style={styles.handleTouchArea} {...handlePan.panHandlers}><View style={styles.handle} /></View>
            <View style={styles.header}>
              <Text style={styles.heading}>Blacklist</Text>
              <Pressable onPress={() => setShowList(true)} style={styles.round} accessibilityRole="button" accessibilityLabel="Open blacklist list">
                <BlacklistIcon width={20} height={20} />
              </Pressable>
            </View>
            <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.segment}>
                {(["Wallet", "Token"] as const).map(option => (
                  <Pressable key={option} onPress={() => { setKind(option); setAddress(""); }} style={[styles.segmentItem, kind === option && styles.segmentActive]}>
                    <Text style={[styles.segmentText, kind === option && styles.segmentTextActive]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={styles.input} value={address} onChangeText={setAddress} autoCapitalize="none" autoCorrect={false} placeholder={`Paste a Solana ${kind.toLowerCase()} address`} placeholderTextColor="#777" accessibilityLabel={`${kind} address`} />
              {kind === "Token" && address.trim().length >= 20 && (
                <View style={styles.tokenPreview}>
                  <View style={styles.coin}><Text style={{ fontSize: 25 }}>🪙</Text></View>
                  <View style={{ flex: 1 }}><Text style={styles.previewName}>Token address</Text><Text style={styles.previewSub} numberOfLines={1}>{address.trim()}</Text></View>
                  <Text style={styles.demo}>DEMO</Text>
                </View>
              )}
              <Text style={styles.reasonLabel}>Reason</Text>
              <View style={styles.reasonRow}>
                {REASONS.map(reason => {
                  const selected = reasons.includes(reason);
                  return (
                    <Pressable key={reason} onPress={() => toggleReason(reason)} style={[styles.chip, selected && styles.chipSelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}>
                      <Text style={styles.chipText}>{reason}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.bottomActions}>
                <View
                  style={styles.slideTrack}
                  onLayout={(event) => {
                    const w = event.nativeEvent.layout.width;
                                        setTrackWidth(w);
                  }}
                >
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.gradientClip, {
                      width: Animated.add(slideX, THUMB_WIDTH),
                      opacity: canSubmit ? 1 : 0.3,
                    }]}
                  >
                    <LinearGradient
                      colors={["#280C08", "#8F2D23", "#FF5546"]}
                      start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                  <Text pointerEvents="none" style={[styles.slideLabel, !canSubmit && styles.slideLabelDisabled]}>
                    {canSubmit ? "Slide to block" : "Add an address"}
                  </Text>
                  <Animated.View
                    {...sliderPan.panHandlers}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Slide right to add to blacklist"
                    accessibilityState={{ disabled: !canSubmit }}
                    style={[styles.slideThumb, !canSubmit && styles.slideThumbDisabled, { transform: [{ translateX: slideX }] }]}
                  >
                    <ChevronRight color={canSubmit ? "#101010" : "#777"} size={23} />
                    <ChevronRight color={canSubmit ? "#101010" : "#777"} size={23} style={{ marginLeft: -15 }} />
                  </Animated.View>
                </View>
                <Text style={styles.disclaimer}>Slide to confirm • Demo only. No on-chain blocking.</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
        {showList && (
          <View style={styles.listOverlay}>
            <BlurView tint="dark" intensity={25} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowList(false)} accessibilityLabel="Back to blacklist search" />
            <BlacklistListPanel onBack={() => setShowList(false)} onDragDown={() => setShowList(false)} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.66)" },
  keyboard: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "#111407", borderTopLeftRadius: 29, borderTopRightRadius: 29, paddingHorizontal: 20, paddingTop: 5, paddingBottom: Platform.OS === "ios" ? 34 : 22, height: "88%", overflow: "hidden" },
  handleTouchArea: { height: 48, alignItems: "center", justifyContent: "center", paddingTop: 0 },
  handle: { width: 55, height: 5, borderRadius: 3, backgroundColor: "#393939" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 21 },
  heading: { color: "#FFFFFF", fontSize: 16 },
  round: { width: 37, height: 37, borderRadius: 20, backgroundColor: "#2B2D25", alignItems: "center", justifyContent: "center" },
  formScroll: { flex: 1 }, formContent: { flexGrow: 1, paddingBottom: 8 },
  segment: { flexDirection: "row", borderWidth: 1, borderColor: LIME, padding: 5, borderRadius: 6, marginBottom: 28 },
  segmentItem: { flex: 1, height: 41, justifyContent: "center", alignItems: "center", borderRadius: 4 },
  segmentActive: { backgroundColor: "#F1F8D0" },
  segmentText: { color: "#FFFFFF", fontSize: 16 }, segmentTextActive: { color: "#121212", fontWeight: "700" },
  input: { borderColor: "#4B4B4B", borderWidth: 1, backgroundColor: "#1D1E19", height: 51, paddingHorizontal: 15, borderRadius: 6, color: "#FFFFFF", fontSize: 14 },
  tokenPreview: { marginTop: 7, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, backgroundColor: "#230C09", borderColor: "#F04D38", borderWidth: 1, borderRadius: 6 },
  coin: { width: 45, height: 45, borderRadius: 24, backgroundColor: "#183D56", alignItems: "center", justifyContent: "center" },
  previewName: { color: "#FFFFFF", fontWeight: "700" }, previewSub: { color: "#C4C4C4", fontSize: 10, marginTop: 4 }, demo: { color: "#B5E6E2", fontSize: 10 },
  reasonLabel: { color: "#FFFFFF", marginTop: 24, marginBottom: 13, fontSize: 14 },
  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 5, borderWidth: 1, borderColor: "#4B4D35", backgroundColor: "#191B10" },
  chipSelected: { borderColor: "#FF5546" }, chipText: { color: "#D0D0C8", fontSize: 11 },
  bottomActions: { marginTop: "auto", paddingTop: 20 },
  slideTrack: { height: SLIDER_HEIGHT, borderRadius: 6, backgroundColor: "#1B1B1D", overflow: "hidden", justifyContent: "center" },
  gradientClip: { position: "absolute", left: 0, top: 0, bottom: 0, overflow: "hidden", borderRadius: 6 },
  slideLabel: { textAlign: "center", color: "#FFFFFF", fontSize: 14 },
  slideLabelDisabled: { color: "#777" },
  slideThumb: { position: "absolute", left: 0, top: 0, height: SLIDER_HEIGHT, width: THUMB_WIDTH, borderRadius: 6, backgroundColor: "#FF5546", alignItems: "center", justifyContent: "center", flexDirection: "row" },
  slideThumbDisabled: { backgroundColor: "#282828" },
  disclaimer: { color: "#8B8B8B", fontSize: 10, textAlign: "center", marginTop: 15 },
  listOverlay: { ...StyleSheet.absoluteFill, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.48)" },
});
