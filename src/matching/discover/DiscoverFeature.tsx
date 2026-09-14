import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  type MatchProfile,
  type ProfileQueue,
} from "@/matching/data-access/profile-queue";
import { createReduxProfileQueue } from "@/matching/data-access/redux-profile-queue";
import { SAMPLE_PROFILES } from "@/matching/data-access/sample-profile-queue";
import { store } from "@/app/store";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = 110;

type ActiveCard = {
  profile: MatchProfile;
  queuePosition: number;
  position: Animated.ValueXY;
};

export function DiscoverFeature() {
  const queue = useMemo(
    () => createReduxProfileQueue(store, "default-discover"),
    [],
  );
  useEffect(() => {
    queue.replace(SAMPLE_PROFILES);
  }, [queue]);
  return <DiscoverView queue={queue} />;
}

export function DiscoverView({ queue }: { queue: ProfileQueue }) {
  const snapshot = useSyncExternalStore(
    queue.subscribe,
    queue.getSnapshot,
    queue.getSnapshot,
  );
  const [isBioOpen, setIsBioOpen] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeInProgress = useRef(false);
  const idlePosition = useRef(new Animated.ValueXY()).current;
  const [activeCard, setActiveCard] = useState<ActiveCard | undefined>(() =>
    snapshot.current
      ? {
          profile: snapshot.current,
          queuePosition: snapshot.position,
          position: new Animated.ValueXY(),
        }
      : undefined,
  );

  useLayoutEffect(() => {
    const currentProfile = snapshot.current;
    const isCurrentCard =
      activeCard?.profile === currentProfile &&
      activeCard?.queuePosition === snapshot.position;

    if (!currentProfile) {
      if (activeCard) setActiveCard(undefined);
    } else if (!isCurrentCard) {
      // A profile is paired with one animation value for its entire lifetime.
      // We never reset the outgoing profile's value for the incoming profile.
      setActiveCard({
        profile: currentProfile,
        queuePosition: snapshot.position,
        position: new Animated.ValueXY(),
      });
    }

    if (swipeInProgress.current && !isCurrentCard) {
      swipeInProgress.current = false;
      setIsSwiping(false);
    }
  }, [activeCard, snapshot]);

  const position = activeCard?.position ?? idlePosition;

  const finishSwipe = (direction: 1 | -1) => {
    if (!activeCard || swipeInProgress.current) return;

    swipeInProgress.current = true;
    setIsSwiping(true);

    Animated.timing(position, {
      toValue: { x: direction * (screenWidth + 80), y: 0 },
      duration: 230,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        swipeInProgress.current = false;
        setIsSwiping(false);
        return;
      }

      queue.advance(activeCard.queuePosition);
      setIsBioOpen(false);
    });
  };
  const resetCard = () =>
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !swipeInProgress.current &&
          Math.abs(gesture.dx) > 6 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: Animated.event(
          [null, { dx: position.x, dy: position.y }],
          { useNativeDriver: false },
        ),
        onPanResponderRelease: (_, gesture) => {
          if (swipeInProgress.current) return;
          if (gesture.dx > SWIPE_THRESHOLD) {
            finishSwipe(1);
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            finishSwipe(-1);
          } else {
            resetCard();
          }
        },
      }),
    [activeCard, position, queue],
  );
  const rotation = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: ["-13deg", "0deg", "13deg"],
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-130, -35],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [35, 130],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const nextCardScale = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [1, 0.97, 1],
    extrapolate: "clamp",
  });
  const nextCardOpacity = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [1, 0.65, 1],
    extrapolate: "clamp",
  });
  const nextCardTranslateY = position.x.interpolate({
    inputRange: [-screenWidth, 0, screenWidth],
    outputRange: [0, 12, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.deck}>
          {snapshot.next && (
            <Animated.View
              style={[
                styles.backCard,
                {
                  opacity: nextCardOpacity,
                  transform: [
                    { scale: nextCardScale },
                    { translateY: nextCardTranslateY },
                  ],
                },
              ]}
            >
              <ProfileCard profile={snapshot.next} />
            </Animated.View>
          )}{" "}
          {activeCard ? (
            <Animated.View
              key={activeCard.queuePosition}
              {...panResponder.panHandlers}
              style={[
                styles.card,
                {
                  transform: [
                    ...position.getTranslateTransform(),
                    { rotate: rotation },
                  ],
                },
              ]}
            >
              <Animated.Text
                style={[
                  styles.stamp,
                  styles.nopeStamp,
                  { opacity: nopeOpacity },
                ]}
              >
                NOPE
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.stamp,
                  styles.likeStamp,
                  { opacity: likeOpacity },
                ]}
              >
                LIKE
              </Animated.Text>
              <ProfileCard
                profile={activeCard.profile}
                expanded={isBioOpen}
              />
            </Animated.View>
          ) : !snapshot.isReady ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Finding people nearby…</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={styles.emptyTitle}>You&apos;re all caught up</Text>
              <Text style={styles.emptyCopy}>
                New people will appear here when they&apos;re nearby.
              </Text>
              <Pressable style={styles.refreshButton} onPress={queue.reset}>
                <Text style={styles.refreshText}>Start over</Text>
              </Pressable>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <View style={styles.actionGroup}>
            <ActionButton
              label="♥"
              color="#38BA8D"
              size="large"
              onPress={() => finishSwipe(1)}
              accessibilityLabel="Like"
              disabled={!activeCard || isSwiping}
            />
            <ActionButton
              label="★"
              color="#9B78D1"
              size="small"
              onPress={() => finishSwipe(1)}
              accessibilityLabel="Favorite"
              disabled={!activeCard || isSwiping}
            />
          </View>
          <View style={styles.actionGroup}>
            <ActionButton
              label="↶"
              color="#F0A442"
              size="small"
              onPress={resetCard}
              accessibilityLabel="Back"
              disabled={!activeCard || isSwiping}
            />
            <ActionButton
              label="×"
              color="#E76B6C"
              size="large"
              onPress={() => finishSwipe(-1)}
              accessibilityLabel="Discard"
              disabled={!activeCard || isSwiping}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
function ProfileCard({
  profile,
  style,
  expanded = false,
}: {
  profile: MatchProfile;
  style?: object;
  expanded?: boolean;
}) {
  return (
    <View style={[styles.cardInner, style]}>
      <Image
        source={{ uri: profile.image }}
        style={styles.photo}
        contentFit="cover"
      />
      <View style={[styles.photoTint, { backgroundColor: profile.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.name}, {profile.age}
          </Text>
        </View>
        <Text style={styles.distance}>● {profile.distance}</Text>
        <View style={styles.tags}>
          {profile.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
        {expanded && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>
    </View>
  );
}
function ActionButton({
  label,
  color,
  size,
  onPress,
  accessibilityLabel,
  disabled = false,
}: {
  label: string;
  color: string;
  size: "small" | "large";
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionButton,
        size === "large" ? styles.actionLarge : styles.actionSmall,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <Text
        style={[
          styles.actionIcon,
          { color },
          size === "large" && styles.actionIconLarge,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFFDF9" },
  safeArea: { flex: 1, position: "relative", overflow: "hidden" },
  header: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    zIndex: 10,
    height: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: "#F8EEE7",
  },
  heading: {
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: "#FFFFFF",
    marginTop: 3,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowRadius: 8,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterIcon: {
    fontSize: 25,
    color: "#564A42",
    transform: [{ rotate: "90deg" }],
  },
  progressRow: {
    position: "absolute",
    top: 72,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    gap: 5,
  },
  progress: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.40)",
  },
  progressActive: { backgroundColor: "#FFFFFF" },
  deck: { ...StyleSheet.absoluteFill, justifyContent: "center" },
  card: { ...StyleSheet.absoluteFill, zIndex: 2 },
  backCard: {
    ...StyleSheet.absoluteFill
  },
  cardInner: { flex: 1, overflow: "hidden", backgroundColor: "#D5A091" },
  photo: { ...StyleSheet.absoluteFill },
  photoTint: { ...StyleSheet.absoluteFill, opacity: 0.12 },
  cardContent: {
    marginTop: "auto",
    padding: 22,
    paddingTop: 20,
    paddingBottom: 100,
    backgroundColor: "rgba(20, 15, 13, 0.44)",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  name: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -1,
    fontWeight: "700",
  },
  infoIcon: { color: "#fff", fontWeight: "800", fontSize: 15 },
  distance: { color: "#F8F4F1", fontSize: 13, marginTop: 6, fontWeight: "600" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 15 },
  tag: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.19)",
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  tagText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  bio: { color: "#fff", fontSize: 13, lineHeight: 19, marginTop: 14 },
  stamp: {
    position: "absolute",
    top: 116,
    zIndex: 4,
    borderWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 2,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  nopeStamp: {
    left: 25,
    color: "#F16868",
    borderColor: "#F16868",
    transform: [{ rotate: "-16deg" }],
  },
  likeStamp: {
    right: 25,
    color: "#50D09E",
    borderColor: "#50D09E",
    transform: [{ rotate: "16deg" }],
  },
  actions: {
    position: "absolute",
    zIndex: 10,
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  actionButton: {
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#856E5D",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionSmall: { width: 48, height: 48, borderRadius: 24 },
  actionLarge: { width: 62, height: 62, borderRadius: 31 },
  actionIcon: { fontSize: 26, fontWeight: "400", lineHeight: 30 },
  actionIconLarge: { fontSize: 37, lineHeight: 40 },
  hint: {
    position: "absolute",
    zIndex: 10,
    left: 0,
    right: 0,
    bottom: 7,
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 4,
  },
  emptyState: {
    flex: 1,
    backgroundColor: "#F9F1EA",
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 4,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 14 },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: "#342A25" },
  emptyCopy: {
    color: "#83756C",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 9,
  },
  refreshButton: {
    marginTop: 22,
    backgroundColor: "#D77969",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  refreshText: { color: "#fff", fontWeight: "700" },
});
