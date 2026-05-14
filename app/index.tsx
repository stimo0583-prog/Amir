import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useColors } from "@/hooks/useColors";
import {
  CHANNELS,
  CATEGORIES,
  getChannelsByCategory,
  getQualityColor,
  type Channel,
} from "@/constants/channels";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const isTV = Platform.isTV;
const isWide = SCREEN_W > 720 || isTV;
const VIDEO_H = isTV
  ? SCREEN_H * 0.66
  : isWide
  ? Math.min(SCREEN_W * 0.6 * (9 / 16), 380)
  : SCREEN_W * (9 / 16);

function ChannelPlayer({
  channel,
  colors,
  styles,
}: {
  channel: Channel;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
}) {
  const [loading, setLoading] = useState(true);

  const player = useVideoPlayer(channel.url, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 8000);
    return () => clearTimeout(t);
  }, []);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(channel.url);
    alert("✅ تم نسخ رابط القناة\nيمكنك لصقه في VLC");
  };

  const handleRetry = () => {
    setLoading(true);
    player.replay();
    setTimeout(() => setLoading(false), 8000);
  };

  return (
    <>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        onLayout={() => setLoading(false)}
      />
      {loading && (
        <View style={styles.videoOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingChannel}>{channel.nameAr}</Text>
          <Text style={styles.loadingText}>جاري تحميل البث...</Text>
        </View>
      )}
      <View style={styles.nowPlayingBar}>
        <View style={styles.livePill}>
          <View style={styles.livePillDot} />
          <Text style={styles.livePillText}>LIVE</Text>
        </View>
        <Text style={styles.nowPlayingName} numberOfLines={1}>
          {channel.nameAr}
        </Text>
        {channel.quality && (
          <View
            style={[
              styles.qBadge,
              {
                backgroundColor: getQualityColor(channel.quality) + "33",
                borderColor: getQualityColor(channel.quality) + "88",
              },
            ]}
          >
            <Text
              style={[
                styles.qBadgeText,
                { color: getQualityColor(channel.quality) },
              ]}
            >
              {channel.quality}
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={handleRetry} style={styles.iconBtn}>
          <Feather name="refresh-cw" size={14} color="#aaa" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCopy} style={styles.iconBtn}>
          <Feather name="copy" size={14} color="#aaa" />
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [search, setSearch] = useState("");
  const [playerKey, setPlayerKey] = useState(0);
  const styles = makeStyles(colors, insets);

  const filteredChannels = getChannelsByCategory(selectedCategory).filter(
    (ch) =>
      ch.nameAr.toLowerCase().includes(search.toLowerCase()) ||
      ch.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectChannel = useCallback((ch: Channel) => {
    setSelectedChannel(null);
    setTimeout(() => {
      setSelectedChannel(ch);
      setPlayerKey((k) => k + 1);
    }, 60);
  }, []);

  const renderCat = ({ item }: { item: (typeof CATEGORIES)[0] }) => {
    const active = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[styles.catBtn, active && styles.catBtnActive]}
        onPress={() => setSelectedCategory(item.id)}
        activeOpacity={0.75}
      >
        <Feather
          name={item.icon as any}
          size={isTV ? 16 : 13}
          color={active ? "#fff" : colors.mutedForeground}
          style={{ marginRight: 5 }}
        />
        <Text style={[styles.catText, active && styles.catTextActive]}>
          {item.labelAr}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderChannel = ({ item }: { item: Channel }) => {
    const active = selectedChannel?.id === item.id;
    const qColor = getQualityColor(item.quality);
    return (
      <TouchableOpacity
        style={[styles.channelRow, active && styles.channelRowActive]}
        onPress={() => handleSelectChannel(item)}
        activeOpacity={0.8}
        hasTVPreferredFocus={active && isTV}
      >
        <View
          style={[
            styles.chIconBox,
            active && { backgroundColor: colors.primary + "30" },
          ]}
        >
          <Feather
            name="tv"
            size={isTV ? 22 : 17}
            color={active ? colors.primary : colors.mutedForeground}
          />
        </View>
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text
            style={[styles.chName, active && { color: colors.primary }]}
            numberOfLines={1}
          >
            {item.nameAr}
          </Text>
          <Text style={styles.chSub} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        {item.quality && (
          <View
            style={[
              styles.qBadge,
              {
                backgroundColor: qColor + "22",
                borderColor: qColor + "55",
              },
            ]}
          >
            <Text style={[styles.qBadgeText, { color: qColor }]}>
              {item.quality}
            </Text>
          </View>
        )}
        {active && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 16 : 6) },
        ]}
      >
        <View style={styles.logo}>
          <View style={styles.logoIcon}>
            <Feather name="play-circle" size={isTV ? 28 : 20} color={colors.primary} />
          </View>
          <Text style={styles.logoText}>IPTV Pro</Text>
        </View>

        {!isTV && (
          <View style={styles.searchBox}>
            <Feather name="search" size={13} color={colors.mutedForeground} style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="بحث عن قناة..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Feather name="x" size={13} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.liveChip}>
          <View style={styles.liveChipDot} />
          <Text style={styles.liveChipText}>LIVE</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.leftPanel}>
          <View style={styles.playerBox}>
            {!selectedChannel ? (
              <View style={styles.placeholder}>
                <View style={styles.placeholderGlow}>
                  <Feather name="play-circle" size={isTV ? 80 : 52} color={colors.primary} />
                </View>
                <Text style={styles.placeholderTitle}>اختر قناة للمشاهدة</Text>
                <Text style={styles.placeholderSub}>
                  {CHANNELS.length} قناة • HD • UHD • 4K
                </Text>
              </View>
            ) : (
              <ChannelPlayer
                key={`${selectedChannel.id}-${playerKey}`}
                channel={selectedChannel}
                colors={colors}
                styles={styles}
              />
            )}
          </View>

          <FlatList
            data={CATEGORIES}
            renderItem={renderCat}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catList}
            style={[styles.catStrip, { borderColor: colors.border }]}
          />

          <View style={styles.countRow}>
            <Feather name="list" size={11} color={colors.mutedForeground} />
            <Text style={styles.countText}>{filteredChannels.length} قناة</Text>
          </View>

          {!isWide && (
            <FlatList
              data={filteredChannels}
              renderItem={renderChannel}
              keyExtractor={(i) => i.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.channelList}
              ItemSeparatorComponent={() => (
                <View style={[styles.sep, { backgroundColor: colors.border }]} />
              )}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <Feather name="inbox" size={34} color={colors.mutedForeground} />
                  <Text style={styles.emptyText}>لا توجد قنوات</Text>
                </View>
              )}
            />
          )}
        </View>

        {isWide && (
          <View style={[styles.rightPanel, { borderColor: colors.border }]}>
            <View style={styles.rightHeader}>
              <Text style={styles.rightHeaderText}>{filteredChannels.length} قناة</Text>
            </View>
            <FlatList
              data={filteredChannels}
              renderItem={renderChannel}
              keyExtractor={(i) => i.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.channelList}
              ItemSeparatorComponent={() => (
                <View style={[styles.sep, { backgroundColor: colors.border }]} />
              )}
              ListEmptyComponent={() => (
                <View style={styles.empty}>
                  <Feather name="inbox" size={34} color={colors.mutedForeground} />
                  <Text style={styles.emptyText}>لا توجد قنوات</Text>
                </View>
              )}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  insets: ReturnType<typeof useSafeAreaInsets>
) {
  return StyleSheet.create({
    root: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: isTV ? 24 : 12,
      paddingBottom: 10,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 8,
    },
    logo: { flexDirection: "row", alignItems: "center", gap: 7 },
    logoIcon: {
      width: isTV ? 48 : 34,
      height: isTV ? 48 : 34,
      borderRadius: 10,
      backgroundColor: colors.primary + "20",
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: { color: colors.foreground, fontSize: isTV ? 22 : 16, fontWeight: "700" },
    searchBox: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.muted,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      color: colors.foreground,
      fontSize: 13,
      textAlign: "right",
      padding: 0,
    },
    liveChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#ef444418",
      borderWidth: 1,
      borderColor: "#ef444455",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
      gap: 4,
    },
    liveChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
    liveChipText: { color: "#ef4444", fontSize: 10, fontWeight: "700" },
    body: { flex: 1, flexDirection: isWide ? "row" : "column" },
    leftPanel: { flex: isWide ? 2.5 : undefined },
    playerBox: { width: "100%", height: VIDEO_H, backgroundColor: "#000", position: "relative" },
    video: { width: "100%", height: "100%" },
    videoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000000cc",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingChannel: { color: "#fff", fontSize: 16, fontWeight: "600" },
    loadingText: { color: "#aaa", fontSize: 13 },
    nowPlayingBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#0a0a0fee",
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: "#2a2a3e",
    },
    livePill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#ef444422",
      borderWidth: 1,
      borderColor: "#ef444466",
      borderRadius: 20,
      paddingHorizontal: 7,
      paddingVertical: 3,
      gap: 4,
    },
    livePillDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#ef4444" },
    livePillText: { color: "#ef4444", fontSize: 9, fontWeight: "700" },
    nowPlayingName: { flex: 1, color: "#fff", fontSize: 13, fontWeight: "600" },
    qBadge: {
      borderRadius: 6,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    qBadgeText: { fontSize: 10, fontWeight: "700" },
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      backgroundColor: "#ffffff11",
      alignItems: "center",
      justifyContent: "center",
    },
    placeholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    placeholderGlow: {
      width: isTV ? 120 : 80,
      height: isTV ? 120 : 80,
      borderRadius: isTV ? 30 : 20,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderTitle: {
      color: colors.foreground,
      fontSize: isTV ? 26 : 18,
      fontWeight: "700",
    },
    placeholderSub: {
      color: colors.mutedForeground,
      fontSize: isTV ? 16 : 12,
    },
    catStrip: {
      borderTopWidth: 1,
      borderBottomWidth: 1,
      maxHeight: 52,
    },
    catList: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
    },
    catBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    catBtnActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    catText: { color: colors.mutedForeground, fontSize: isTV ? 14 : 12, fontWeight: "500" },
    catTextActive: { color: "#fff", fontWeight: "700" },
    countRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 6,
      gap: 5,
    },
    countText: { color: colors.mutedForeground, fontSize: 11 },
    channelList: { paddingBottom: 24 },
    channelRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: isTV ? 14 : 10,
    },
    channelRowActive: { backgroundColor: colors.primary + "12" },
    chIconBox: {
      width: isTV ? 44 : 34,
      height: isTV ? 44 : 34,
      borderRadius: 10,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
    },
    chName: {
      color: colors.foreground,
      fontSize: isTV ? 16 : 13,
      fontWeight: "600",
      textAlign: "right",
    },
    chSub: {
      color: colors.mutedForeground,
      fontSize: isTV ? 12 : 11,
      textAlign: "right",
    },
    liveIndicator: { width: 8, alignItems: "center" },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444" },
    sep: { height: 1, marginHorizontal: 14 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
    emptyText: { color: colors.mutedForeground, fontSize: 14 },
    rightPanel: {
      flex: 1,
      borderLeftWidth: 1,
    },
    rightHeader: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rightHeaderText: { color: colors.mutedForeground, fontSize: 12 },
  });
}
