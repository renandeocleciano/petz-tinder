import { forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';

export type SwipeDirection = 'left' | 'right' | 'up';

export interface SwipeableCardHandle {
  swipe: (direction: SwipeDirection) => void;
}

interface SwipeableCardProps {
  children: ReactNode;
  onSwiped: (direction: SwipeDirection) => void;
  enabled?: boolean;
}

const OUT_DURATION = 260;

function Stamp({ label, color, style }: { label: string; color: string; style: object }) {
  return (
    <Animated.View style={[styles.stamp, { borderColor: color }, style]} pointerEvents="none">
      <AppText variant="title" style={{ color }}>
        {label}
      </AppText>
    </Animated.View>
  );
}

/**
 * Horizontal swipe with rotation and LIKE/NOPE feedback. Swiping up = super like.
 * Buttons can trigger the same animation through the imperative `swipe()` handle.
 */
export const SwipeableCard = forwardRef<SwipeableCardHandle, SwipeableCardProps>(
  function SwipeableCard({ children, onSwiped, enabled = true }, ref) {
    const { width, height } = useWindowDimensions();
    const threshold = width * 0.28;
    const x = useSharedValue(0);
    const y = useSharedValue(0);

    const finish = (direction: SwipeDirection) => {
      onSwiped(direction);
      x.set(0);
      y.set(0);
    };

    const flyOut = (direction: SwipeDirection) => {
      'worklet';
      const targetX = direction === 'left' ? -width * 1.5 : direction === 'right' ? width * 1.5 : 0;
      const targetY = direction === 'up' ? -height : 0;
      y.set(withTiming(targetY, { duration: OUT_DURATION }));
      x.set(
        withTiming(targetX, { duration: OUT_DURATION }, (done) => {
          if (done) scheduleOnRN(finish, direction);
        }),
      );
    };

    useImperativeHandle(ref, () => ({ swipe: (direction) => flyOut(direction) }));

    const pan = Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX([-12, 12])
      .onUpdate((event) => {
        x.set(event.translationX);
        y.set(event.translationY);
      })
      .onEnd((event) => {
        if (event.translationX > threshold) flyOut('right');
        else if (event.translationX < -threshold) flyOut('left');
        else if (event.translationY < -threshold * 1.4) flyOut('up');
        else {
          x.set(withSpring(0));
          y.set(withSpring(0));
        }
      });

    const cardStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: x.get() },
        { translateY: y.get() },
        { rotate: `${interpolate(x.get(), [-width, width], [-14, 14])}deg` },
      ],
    }));
    const likeStyle = useAnimatedStyle(() => ({
      opacity: interpolate(x.get(), [0, threshold], [0, 1], Extrapolation.CLAMP),
    }));
    const nopeStyle = useAnimatedStyle(() => ({
      opacity: interpolate(x.get(), [-threshold, 0], [1, 0], Extrapolation.CLAMP),
    }));
    const superStyle = useAnimatedStyle(() => ({
      opacity: interpolate(y.get(), [-threshold * 1.4, 0], [1, 0], Extrapolation.CLAMP),
    }));

    return (
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.container, cardStyle]}>
          {children}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Stamp label="CURTI" color={colors.teal} style={[styles.left, likeStyle]} />
            <Stamp label="NÃO" color={colors.coral} style={[styles.right, nopeStyle]} />
            <Stamp label="SUPER" color={colors.orange} style={[styles.center, superStyle]} />
          </View>
        </Animated.View>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  stamp: {
    position: 'absolute',
    top: spacing.huge + spacing.xl,
    borderWidth: 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.frosted,
  },
  left: { left: spacing.xl, transform: [{ rotate: '-14deg' }] },
  right: { right: spacing.xl, transform: [{ rotate: '14deg' }] },
  center: { alignSelf: 'center', top: '40%' },
});
