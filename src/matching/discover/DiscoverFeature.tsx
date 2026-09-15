import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import {
    useCallback,
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
    Easing,
    Modal,
    PanResponder,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    type UserRecommendationProfile,
    type ProfileQueue,
} from "@/matching/data-access/profile-queue";
import { createReduxProfileQueue } from "@/matching/data-access/redux-profile-queue";
import { store } from "@/shared/data-access/store";
import { requestUserRecommendations } from "@/matching/data-access/user-recommendation-service";
import {
    completeSuccessfulLike,
    type MatchPresentation,
} from "@/matching/swipe/match-presentation";
import { getSwipeIntent } from "@/matching/swipe/swipe-intent";
import { useLikeDeveloper } from "@/matching/swipe/use-like-developer";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = 110;
const MINIMUM_REMAINING_RECOMMENDATIONS = 3;

type ActiveCard = {
    profile: UserRecommendationProfile;
    queuePosition: number;
    position: Animated.ValueXY;
};

export function DiscoverFeature() {
    const queue = useMemo(
        () => createReduxProfileQueue(store, "default-discover"),
        [],
    );
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
    const [matchPresentation, setMatchPresentation] =
        useState<MatchPresentation | null>(null);
    const [recommendationError, setRecommendationError] = useState<string | null>(null);
    const [recommendationRequestAttempt, setRecommendationRequestAttempt] = useState(0);
    const {
        clearError: clearLikeError,
        error: likeError,
        isSubmitting: isSubmittingLike,
        submitLike,
    } = useLikeDeveloper();
    const swipeInProgress = useRef(false);
    const recommendationRequestInProgress = useRef(false);
    const isInitialRecommendationRequest = useRef(true);
    const [idlePosition] = useState(() => new Animated.ValueXY());
    const [activeCard, setActiveCard] = useState<ActiveCard | undefined>(() =>
        snapshot.current
            ? {
                profile: snapshot.current,
                queuePosition: snapshot.position,
                position: new Animated.ValueXY(),
            }
            : undefined,
    );

    /* eslint-disable react-hooks/set-state-in-effect --
     * The animated card intentionally mirrors an external queue snapshot before
     * paint so the outgoing card keeps its animation value until advancement. */
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
    /* eslint-enable react-hooks/set-state-in-effect */

    const position = activeCard?.position ?? idlePosition;
    const targetUserId = activeCard?.profile.id;

    useEffect(() => {
        clearLikeError();
    }, [clearLikeError, targetUserId]);

    useEffect(() => {
        const remainingRecommendations = snapshot.length - snapshot.position;
        const shouldRequestRecommendations =
            isInitialRecommendationRequest.current ||
            remainingRecommendations < MINIMUM_REMAINING_RECOMMENDATIONS;

        if (!shouldRequestRecommendations || recommendationRequestInProgress.current) return;

        recommendationRequestInProgress.current = true;
        void requestUserRecommendations()
            .then((profiles) => {
                if (isInitialRecommendationRequest.current) {
                    queue.replace(profiles);
                    isInitialRecommendationRequest.current = false;
                } else {
                    queue.append(profiles);
                }
                setRecommendationError(null);
            })
            .catch((cause: unknown) => {
                setRecommendationError(
                    cause instanceof Error ? cause.message : "Could not load recommendations.",
                );
            })
            .finally(() => {
                recommendationRequestInProgress.current = false;
            });
    }, [queue, recommendationRequestAttempt, snapshot.length, snapshot.position]);

    const finishSwipe = useCallback((direction: 1 | -1) =>
        new Promise<boolean>((resolve) => {
            if (!activeCard || swipeInProgress.current) {
                resolve(false);
                return;
            }

            swipeInProgress.current = true;
            setIsSwiping(true);

            Animated.timing(position, {
                toValue: { x: direction * (screenWidth + 80), y: 0 },
                duration: 300,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (!finished) {
                    swipeInProgress.current = false;
                    setIsSwiping(false);
                    resolve(false);
                    return;
                }

                queue.advance(activeCard.queuePosition);
                setIsBioOpen(false);
                resolve(true);
            });
        }), [activeCard, position, queue]);
    const dismissMatch = useCallback(() => {
        setMatchPresentation(null);
    }, []);
    const resetCard = useCallback(() =>
        Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            stiffness: 220,
            damping: 22,
            mass: 0.8,
            useNativeDriver: true,
        }).start(), [position]);
    const handleLike = useCallback(async () => {
        if (!activeCard || !targetUserId || isSwiping || isSubmittingLike) return;

        const result = await submitLike(targetUserId);
        if (!result) return;

        await completeSuccessfulLike({
            result,
            profile: activeCard.profile,
            advance: () => finishSwipe(1),
            present: setMatchPresentation,
        });
    }, [
        activeCard,
        finishSwipe,
        isSubmittingLike,
        isSwiping,
        submitLike,
        targetUserId,
    ]);
    /* eslint-disable react-hooks/refs --
     * These refs are read only by PanResponder event callbacks after render. */
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gesture) =>
                    !swipeInProgress.current &&
                    !isSubmittingLike &&
                    Math.abs(gesture.dx) > 6 &&
                    Math.abs(gesture.dx) > Math.abs(gesture.dy),
                onPanResponderMove: Animated.event(
                    [null, { dx: position.x, dy: position.y }],
                    { useNativeDriver: false },
                ),
                onPanResponderRelease: (_, gesture) => {
                    if (swipeInProgress.current) return;
                    const intent = getSwipeIntent(gesture.dx, SWIPE_THRESHOLD);
                    if (intent === "like") {
                        void handleLike();
                    } else if (intent === "pass") {
                        void finishSwipe(-1);
                    } else {
                        resetCard();
                    }
                },
            }),
        [finishSwipe, handleLike, isSubmittingLike, position, resetCard],
    );
    /* eslint-enable react-hooks/refs */
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
                    )}
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
                            {recommendationError && (
                                <>
                                    <Text style={styles.errorText}>{recommendationError}</Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={() => setRecommendationRequestAttempt((attempt) => attempt + 1)}
                                    >
                                        <Text style={styles.refreshText}>Try again</Text>
                                    </Pressable>
                                </>
                            )}
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
                            {recommendationError && <Text style={styles.errorText}>{recommendationError}</Text>}
                        </View>
                    )}
                </View>
                {(likeError || (activeCard && !targetUserId)) && (
                    <View style={styles.likeMessage} accessibilityLiveRegion="polite">
                        <Text style={styles.likeMessageText}>
                            {likeError ??
                                "This developer is still loading. Try again shortly."}
                        </Text>
                    </View>
                )}
                <View style={styles.actions}>
                    <ActionButton
                        label="♥"
                        color="#38BA8D"
                        size="large"
                        onPress={() => void handleLike()}
                        accessibilityLabel="Like"
                        disabled={
                            !activeCard ||
                            !targetUserId ||
                            isSwiping ||
                            isSubmittingLike
                        }
                    />
                    <ActionButton
                        label="★"
                        color="#9B78D1"
                        size="small"
                        onPress={() => void handleLike()}
                        accessibilityLabel="Favorite"
                        disabled={
                            !activeCard ||
                            !targetUserId ||
                            isSwiping ||
                            isSubmittingLike
                        }
                    />
                    <ActionButton
                        label="×"
                        color="#E76B6C"
                        size="large"
                        onPress={() => void finishSwipe(-1)}
                        accessibilityLabel="Discard"
                        disabled={!activeCard || isSwiping || isSubmittingLike}
                    />
                </View>
            </SafeAreaView>
            <MatchOverlay match={matchPresentation} onDismiss={dismissMatch} />
        </View>
    );
}

function MatchOverlay({
    match,
    onDismiss,
}: {
    match: MatchPresentation | null;
    onDismiss: () => void;
}) {
    if (!match) return null;

    return (
        <Modal
            animationType="fade"
            onRequestClose={onDismiss}
            statusBarTranslucent
            transparent
            visible
        >
            <View
                accessibilityViewIsModal
                style={styles.matchBackdrop}
            >
                <View
                    style={styles.matchDialog}
                >
                    <Text style={styles.matchEyebrow}>PAIRUP</Text>
                    <Text
                        accessibilityLabel={`It’s a Match with ${match.displayName}`}
                        accessibilityLiveRegion="assertive"
                        accessibilityRole="header"
                        style={styles.matchTitle}
                    >
                        It’s a Match
                    </Text>
                    <Image
                        accessibilityLabel={`${match.displayName} profile photo`}
                        contentFit="cover"
                        source={{
                            uri:
                                match.avatarUrl ??
                                "https://placehold.co/320x320/png",
                        }}
                        style={styles.matchAvatar}
                    />
                    <Text style={styles.matchName}>{match.displayName}</Text>
                    <Text style={styles.matchCopy}>
                        You both want to build something great together.
                    </Text>
                    <Pressable
                        accessibilityHint="Closes this match confirmation"
                        accessibilityLabel="Keep swiping"
                        accessibilityRole="button"
                        onPress={onDismiss}
                        style={({ pressed }) => [
                            styles.matchButton,
                            pressed && styles.matchButtonPressed,
                        ]}
                    >
                        <Text style={styles.matchButtonText}>Keep swiping</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

function ProfileCard({
    profile,
    style,
    expanded = false,
}: {
    profile: UserRecommendationProfile;
    style?: object;
    expanded?: boolean;
}) {
    return (
        <View style={[styles.cardInner, style]}>
            <Image
                source={{ uri: profile.avatar_url ?? "https://placehold.co/1100x1600/png" }}
                style={styles.photo}
                contentFit="cover"
            />
            <View style={styles.photoTint} />
            <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                    <Text style={styles.name}>
                        {profile.display_name}
                    </Text>
                </View>
                <Text style={styles.distance}>
                    ● {[profile.skill_level, profile.availability].filter(Boolean).join(" · ") || "Developer"}
                </Text>
                <View style={styles.tags}>
                    {[...(profile.tech_stack ?? []), ...(profile.preferred_roles ?? [])].map((tag) => (
                        <View key={tag} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                        </View>
                    ))}
                </View>
                {expanded && profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
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
        <BlurView
            intensity={78}
            tint="light"
            style={[
                styles.actionGlass,
                size === "large" ? styles.actionLarge : styles.actionSmall,
                disabled && styles.actionButtonDisabled,
            ]}
        >
            <Pressable
                accessibilityLabel={accessibilityLabel}
                accessibilityRole="button"
                onPress={onPress}
                disabled={disabled}
                style={({ pressed }) => [
                    styles.actionButton,
                    pressed && styles.actionButtonPressed,
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
        </BlurView>
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
    photoTint: { ...StyleSheet.absoluteFill, backgroundColor: "#241916", opacity: 0.12 },
    cardContent: {
        marginTop: "auto",
        padding: 22,
        paddingTop: 20,
        paddingBottom: 184,
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
        left: 22,
        right: 22,
        bottom: 94,
        minHeight: 70,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },
    likeMessage: {
        position: "absolute",
        zIndex: 11,
        left: 24,
        right: 24,
        bottom: 92,
        alignItems: "center",
    },
    likeMessageText: {
        color: "#FFFFFF",
        backgroundColor: "rgba(52, 42, 37, 0.88)",
        borderRadius: 14,
        overflow: "hidden",
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 12,
        fontWeight: "600",
        textAlign: "center",
    },
    actionGroup: {
        flexDirection: "row",
        alignItems: "center",
        gap: 15,
    },
    actionButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.20)",
    },
    actionGlass: {
        overflow: "hidden",
        marginHorizontal: 8,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.72)",
        backgroundColor: "rgba(255,255,255,0.18)",
        boxShadow: "0px 7px 18px rgba(20, 15, 13, 0.22)",
        elevation: 8,
    },
    actionButtonPressed: {
        transform: [{ scale: 0.9 }],
        opacity: 0.78,
    },
    actionButtonDisabled: {
        opacity: 0.5,
    },
    actionSmall: { width: 62, height: 62, borderRadius: 31 },
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
    errorText: { color: "#9D3029", marginTop: 12, textAlign: "center" },
    matchBackdrop: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backgroundColor: "rgba(32, 23, 20, 0.72)",
    },
    matchDialog: {
        width: "100%",
        maxWidth: 380,
        alignItems: "center",
        borderRadius: 28,
        paddingHorizontal: 28,
        paddingVertical: 32,
        backgroundColor: "#FFFDF9",
        boxShadow: "0px 12px 30px rgba(36, 25, 22, 0.30)",
        elevation: 12,
    },
    matchEyebrow: {
        color: "#9B78D1",
        fontSize: 11,
        fontWeight: "800",
        letterSpacing: 2,
    },
    matchTitle: {
        marginTop: 6,
        color: "#342A25",
        fontSize: 32,
        fontWeight: "800",
        letterSpacing: -1,
    },
    matchAvatar: {
        width: 148,
        height: 148,
        marginTop: 22,
        borderRadius: 74,
        backgroundColor: "#F1E7DF",
    },
    matchName: {
        marginTop: 18,
        color: "#342A25",
        fontSize: 23,
        fontWeight: "700",
    },
    matchCopy: {
        marginTop: 8,
        color: "#75675F",
        fontSize: 14,
        lineHeight: 20,
        textAlign: "center",
    },
    matchButton: {
        width: "100%",
        minHeight: 48,
        marginTop: 24,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 24,
        backgroundColor: "#38BA8D",
    },
    matchButtonPressed: {
        opacity: 0.82,
    },
    matchButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "800",
    },
});
