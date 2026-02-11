import type { PropsWithChildren, ReactElement } from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from "react-native-reanimated";
import { Extrapolate } from 'react-native-reanimated';
const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage?: ReactElement;
  headerBackgroundColor?: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const scheme = useColorScheme() ?? "light";
  const backgroundColor = headerBackgroundColor
    ? headerBackgroundColor[scheme]
    : scheme === "dark"
      ? "#0B0F14"
      : "#E7F3FF";

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  const headerAnimatedStyle = useAnimatedStyle(() => {
  const y = scrollOffset.value;
  const H = 250;
  return {
    transform: [
      {
        translateY: interpolate(
          y,
          [-H, 0, H],
          [-H / 2, 0, H * 0.75],
          Extrapolate.CLAMP
        ),
      },
      {
        scale: interpolate(
          y,
          [-H, 0, H],
          [2, 1, 1],
          Extrapolate.CLAMP
        ),
      },
    ],
  } as any;
});

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View
          style={[styles.header, { backgroundColor }, headerAnimatedStyle]}
        >
          {headerImage}
        </Animated.View>

        <View style={styles.content}>{children}</View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingBottom: 24 },
  header: {
    height: HEADER_HEIGHT,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
});






