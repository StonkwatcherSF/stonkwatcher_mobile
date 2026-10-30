
import React from "react";
import { useLocalSearchParams } from "expo-router";
import TradeSheet from "../../../components/TradeSheet";

export default function BuyScreen() {
  const { tokenId } = useLocalSearchParams<{
    tokenId?: string;
  }>();

  return <TradeSheet mode="buy" tokenId={tokenId} />;
}
