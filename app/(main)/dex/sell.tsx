
import React from "react";
import { useLocalSearchParams } from "expo-router";
import TradeSheet from "../../../components/TradeSheet";

export default function SellScreen() {
  const { tokenId } = useLocalSearchParams<{
    tokenId?: string;
  }>();

  return <TradeSheet mode="sell" tokenId={tokenId} />;
}
