
import React, {
  createContext,
  useContext,
  useMemo,
} from "react";
import type {
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import {
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

type NavAnimationContextType = {
  compact: SharedValue<number>;
};

const NavAnimationContext =
  createContext<NavAnimationContextType | null>(null);

export function NavAnimationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const compact = useSharedValue(0);

  const value = useMemo(
    () => ({ compact }),
    [compact]
  );

  return (
    <NavAnimationContext.Provider value={value}>
      {children}
    </NavAnimationContext.Provider>
  );
}

export function useNavAnimation() {
  const context = useContext(NavAnimationContext);

  if (!context) {
    throw new Error(
      "useNavAnimation must be used inside NavAnimationProvider"
    );
  }

  return context;
}


export function useNavScroll() {
  const { compact } = useNavAnimation();

  const previousY = React.useRef(0);
  const distance = React.useRef(0);
  const lastDirection = React.useRef(0);

  const isDragging = React.useRef(false);

  function onScroll(
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) {
    const y = Math.max(
      0,
      event.nativeEvent.contentOffset.y
    );

    const difference = y - previousY.current;
    previousY.current = y;

    // Ignore momentum scrolling after finger release.
    // The nav keeps its last size.
    if (!isDragging.current) {
      return;
    }

    // Ignore tiny movements.
    if (
      Math.abs(difference) < 1 ||
      Math.abs(difference) > 80
    ) {
      return;
    }

    const direction = difference > 0 ? 1 : -1;

    if (direction !== lastDirection.current) {
      distance.current = 0;
      lastDirection.current = direction;
    }

    distance.current += Math.abs(difference);

    // Scroll DOWN: shrink and stay shrunk.
    if (
      direction === 1 &&
      y > 45 &&
      distance.current >= 22
    ) {
      compact.value = 1;
      distance.current = 0;
    }

    // Scroll UP: restore full size.
    if (
      direction === -1 &&
      distance.current >= 22
    ) {
      compact.value = 0;
      distance.current = 0;
    }
  }

  function onScrollBeginDrag() {
    isDragging.current = true;
    distance.current = 0;
    lastDirection.current = 0;
  }

  function onScrollEndDrag() {
    isDragging.current = false;
    distance.current = 0;
    lastDirection.current = 0;
  }

  return {
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
  };
}
