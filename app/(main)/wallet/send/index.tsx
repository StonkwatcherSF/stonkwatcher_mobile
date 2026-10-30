import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronsRight,
  Delete,
  Search,
  Wallet,
} from 'lucide-react-native';

const LIME = '#C6E900';
const AVAILABLE = 1500.14; // Demo wallet balance. No real transfers.
const HANDLE = 48;

const USERS = [
  {
    name: 'Rasmr',
    handle: '@rasmr',
    icon: '🧑🏻‍💻',
    balance: '$89,432.90',
    address: '5bC8mX1sD3qR1vT6bh8Kc2mN9yZ4aQ7wE6rT2uP8sV',
  },
  {
    name: 'Unipcs',
    handle: '@unipcs',
    icon: '🤖',
    balance: '$93,737.34',
    address: '7iD3sR6mV9cP2xT4bN8kQ5wY1aE6fH3jL9uS2zX4dG7pM',
  },
];

type User = (typeof USERS)[number];
type Stage = 'recipient' | 'amount' | 'review';

function VerifiedName({ name }: { name: string }) {
  return (
    <View style={styles.verifiedRow}>
      <Text style={styles.userName} numberOfLines={1}>{name}</Text>
      <BadgeCheck size={17} color={LIME} strokeWidth={2.2} />
    </View>
  );
}

export default function SendScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('recipient');
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<User | null>(null);
  const [amountText, setAmountText] = useState('0');
  const [trackWidth, setTrackWidth] = useState(300);
  const [busy, setBusy] = useState(false);

  const slide = useRef(new Animated.Value(0)).current;
  const amount = Number(amountText);
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= AVAILABLE;
  const max = Math.max(0, trackWidth - HANDLE);

  // Keep PanResponder callbacks in sync with current state without recreating gestures.
  const state = useRef({ max, busy, valid: validAmount && !!recipient, amount, recipient });
  state.current = { max, busy, valid: validAmount && !!recipient, amount, recipient };

  const reset = () => {
    Animated.spring(slide, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 22,
    }).start();
  };

  const finish = () => {
    const current = state.current;
    if (!current.valid || current.busy || !current.recipient) {
      reset();
      return;
    }

    state.current.busy = true;
    setBusy(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.timing(slide, {
      toValue: current.max,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        state.current.busy = false;
        setBusy(false);
        return;
      }
      // Demo navigation only; no actual funds move.
      router.replace({
        pathname: '/wallet' as any,
        params: {
          sendAmount: current.amount.toFixed(2),
          sendName: current.recipient!.name,
          sendHandle: current.recipient!.handle,
          sendId: String(Date.now()),
        },
      });
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => state.current.valid && !state.current.busy,
      onMoveShouldSetPanResponder: (_, g) =>
        state.current.valid && !state.current.busy && Math.abs(g.dx) > 3,
      onPanResponderMove: (_, g) => {
        if (!state.current.valid || state.current.busy) return;
        slide.setValue(Math.max(0, Math.min(state.current.max, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        const limit = state.current.max;
        if (g.dx >= limit * 0.78 || (g.vx > 1.2 && g.dx > limit * 0.45)) {
          finish();
        } else {
          reset();
        }
      },
      onPanResponderTerminate: reset,
    })
  ).current;

  useEffect(() => {
    if (stage === 'review') slide.setValue(0);
  }, [stage, slide]);

  const goBack = () => {
    if (busy) return;
    if (stage === 'review') {
      reset();
      setStage('amount');
    } else if (stage === 'amount') {
      setStage('recipient');
    } else {
      router.back();
    }
  };

  const append = (key: string) => {
    if (key === 'delete') {
      setAmountText(v => (v.length <= 1 ? '0' : v.slice(0, -1)));
      return;
    }
    setAmountText(v => {
      if (key === '.' && v.includes('.')) return v;
      if (v.includes('.') && v.split('.')[1]?.length >= 2) return v;
      if (v.replace('.', '').length >= 9) return v;
      return v === '0' && key !== '.' ? key : v + key;
    });
  };

  const matches = USERS.filter(u =>
    `${u.name} ${u.handle}`.toLowerCase().includes(query.toLowerCase().trim())
  );

  // Animate a fixed-width gradient using transforms, NOT width. This works
  // with useNativeDriver:true and avoids NativeAnimatedValidation errors.
  const gradientTranslateX = slide.interpolate({
    inputRange: [0, Math.max(1, max)],
    outputRange: [-Math.max(0, trackWidth - HANDLE), 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.overlay}>
      <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => !busy && router.back()}
        accessibilityLabel="Close send sheet"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, stage === 'amount' && styles.amountSheet]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Pressable onPress={goBack} style={styles.back} accessibilityLabel="Go back">
              <ChevronLeft color="white" size={20} />
            </Pressable>
            <Text style={styles.heading}>{stage === 'review' ? 'Send To' : 'Send'}</Text>
          </View>

          {stage === 'recipient' && (
            <>
              <View style={styles.searchWrap}>
                <Search color="#666" size={16} />
                <TextInput
                  style={styles.search}
                  placeholder="Search for users"
                  placeholderTextColor="#777"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={query}
                  onChangeText={setQuery}
                />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
                {matches.map(u => (
                  <Pressable
                    key={u.handle}
                    style={styles.userRow}
                    onPress={() => {
                      setRecipient(u);
                      setStage('amount');
                    }}
                  >
                    <View style={styles.avatar}><Text style={styles.avatarEmoji}>{u.icon}</Text></View>
                    <View style={styles.userInfo}>
                      <VerifiedName name={u.name} />
                      <Text style={styles.muted}>{u.handle}</Text>
                    </View>
                    <Wallet color={LIME} size={13} />
                    <Text style={styles.userBalance}>{u.balance}</Text>
                  </Pressable>
                ))}
                {matches.length === 0 && <Text style={styles.empty}>No demo users found</Text>}
              </ScrollView>
            </>
          )}

          {stage === 'amount' && (
            <>
              <View style={styles.amountArea}>
                <Text style={styles.amountDisplay}>
                  ${Number(amountText || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.available}>
                <Text style={styles.muted}>Available </Text>
                <Text style={styles.availableText}>
                  ${AVAILABLE.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.percentRow}>
                {[10, 25, 50, 100].map(p => (
                  <Pressable
                    key={p}
                    style={styles.percent}
                    onPress={() => setAmountText((Math.floor(AVAILABLE * p) / 100).toFixed(2))}
                  >
                    <Text style={styles.percentText}>{p === 100 ? 'Max' : `${p}%`}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.keypad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'].map(k => (
                  <Pressable key={k} style={styles.key} onPress={() => append(k)}>
                    {k === 'delete' ? (
                      <Delete color="white" size={24} />
                    ) : (
                      <Text style={styles.keyText}>{k}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
              <Pressable
                disabled={!validAmount || !recipient}
                style={[styles.continue, !validAmount && styles.continueDisabled]}
                onPress={() => setStage('review')}
              >
                <Text style={styles.continueText}>Continue</Text>
              </Pressable>
              <Text style={styles.note}>Demo only • No real funds are sent.</Text>
            </>
          )}

          {stage === 'review' && recipient && (
            <>
              <View style={styles.reviewUser}>
                <View style={styles.avatar}><Text style={styles.avatarEmoji}>{recipient.icon}</Text></View>
                <View style={styles.userInfo}>
                  <VerifiedName name={recipient.name} />
                  <Text style={styles.muted}>{recipient.handle}</Text>
                </View>
                <Wallet size={13} color={LIME} />
                <Text style={styles.userBalance}>{recipient.balance}</Text>
              </View>

              <View style={styles.details}>
                <Text style={styles.detailsTitle}>Details</Text>
                <View style={styles.detailLine}>
                  <Text style={styles.muted}>To</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {recipient.address.slice(0, 11)}...{recipient.address.slice(-10)}
                  </Text>
                </View>
                <View style={styles.detailLine}>
                  <Text style={styles.muted}>Amount</Text>
                  <Text style={styles.detailValue}>${amount.toFixed(2)}</Text>
                </View>
                <View style={styles.detailLine}>
                  <Text style={styles.muted}>Network</Text>
                  <Text style={styles.detailValue}>Solana</Text>
                </View>
                <View style={styles.detailLine}>
                  <Text style={styles.muted}>Fee</Text>
                  <Text style={styles.detailValue}>$0</Text>
                </View>
              </View>

              <View
                style={[styles.slider, busy && styles.sliderBusy]}
                onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.gradientFill,
                    { width: trackWidth, transform: [{ translateX: gradientTranslateX }] },
                  ]}
                >
                  <LinearGradient
                    colors={['#313708', '#768D00', LIME]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
                <Text pointerEvents="none" style={styles.sliderText}>Slide to send</Text>
                <Animated.View
                  {...pan.panHandlers}
                  style={[styles.thumb, { transform: [{ translateX: slide }] }]}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Slide right to confirm demo send"
                >
                  <ChevronsRight size={23} color="#111" />
                </Animated.View>
              </View>
              <Text style={styles.note}>Simulation only • No real transfer will occur.</Text>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,.72)', justifyContent: 'flex-end' },
  keyboard: { justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#111407', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 14, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 35 : 22, minHeight: 195 },
  amountSheet: { minHeight: 570 },
  grabber: { width: 55, height: 5, borderRadius: 4, backgroundColor: '#35392E', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25 },
  back: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#303329', justifyContent: 'center', alignItems: 'center' },
  heading: { color: 'white', fontSize: 15, fontWeight: '600' },
  searchWrap: { height: 43, borderWidth: 1, borderColor: '#404438', backgroundColor: '#20221C', borderRadius: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10 },
  search: { color: 'white', fontSize: 13, flex: 1, marginLeft: 6, height: '100%' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 5, paddingVertical: 12 },
  avatar: { width: 40, height: 40, borderRadius: 22, backgroundColor: '#243035', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 25 },
  userInfo: { flex: 1, minWidth: 0 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  userName: { color: 'white', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  muted: { color: '#A2A2A2', fontSize: 11 },
  userBalance: { color: 'white', fontSize: 11 },
  empty: { color: '#999', textAlign: 'center', padding: 20 },
  amountArea: { height: 130, alignItems: 'center', justifyContent: 'center' },
  amountDisplay: { color: '#E5E5E5', fontSize: 36, fontWeight: '700' },
  available: { flexDirection: 'row', marginBottom: 12 },
  availableText: { color: 'white', fontSize: 11 },
  percentRow: { flexDirection: 'row', gap: 5, marginBottom: 10 },
  percent: { flex: 1, backgroundColor: '#292F03', height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 3 },
  percentText: { color: 'white', fontSize: 11 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  key: { width: '33.3333%', height: 55, justifyContent: 'center', alignItems: 'center' },
  keyText: { color: 'white', fontSize: 22, fontWeight: '600' },
  continue: { backgroundColor: LIME, height: 44, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  continueDisabled: { opacity: 0.45 },
  continueText: { color: '#101010', fontWeight: '700', fontSize: 14 },
  reviewUser: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#191D13', borderRadius: 5, padding: 8, marginBottom: 18 },
  details: { padding: 8, marginBottom: 24 },
  detailsTitle: { color: 'white', fontSize: 12, marginBottom: 12 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, gap: 10 },
  detailValue: { color: 'white', fontSize: 10, maxWidth: '70%', textAlign: 'right' },
  slider: { height: 49, backgroundColor: '#1D1D1D', borderRadius: 5, justifyContent: 'center', overflow: 'hidden' },
  sliderBusy: { opacity: 0.65 },
  gradientFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  sliderText: { color: '#B6B6B6', textAlign: 'center', fontSize: 12 },
  thumb: { position: 'absolute', top: 0, left: 0, width: HANDLE, height: 49, backgroundColor: LIME, borderRadius: 5, justifyContent: 'center', alignItems: 'center' },
  note: { color: '#858585', fontSize: 10, textAlign: 'center', marginTop: 13 },
});
