import type { Href } from "expo-router";

export function dexHref(mint: string): Href {
  return `/dex/${encodeURIComponent(mint)}` as Href;
}

export function tracerHref(address: string): Href {
  return {
    pathname: "/tracer/[address]",
    params: { address: address.trim() },
  };
}
