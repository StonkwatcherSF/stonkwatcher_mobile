
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Text,
  type TextStyle,
} from "react-native";

type Props = {
  amount: number;
  duration?: number;
  style?: TextStyle;
};

export default function AnimatedAmount({
  amount,
  duration = 650,
  style,
}: Props) {
  const animatedValue = useRef(
    new Animated.Value(0)
  ).current;

  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    animatedValue.stopAnimation();
    animatedValue.setValue(0);
    setDisplayValue(0);

    const listenerId = animatedValue.addListener(
      ({ value }) => {
        setDisplayValue(value);
      }
    );

    Animated.timing(animatedValue, {
      toValue: Math.abs(amount),
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.stopAnimation();
      animatedValue.removeListener(listenerId);
    };
  }, [amount, duration, animatedValue]);

  const formattedAmount = Math.abs(displayValue).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );

  const sign = amount < 0 ? "-" : "+";

  return (
    <Text style={style}>
      {sign}${formattedAmount}
    </Text>
  );
}
