import type { BubbleMapData, BubbleMapLink, BubbleMapNode } from "./types";

export type Palette = { fill: string; stroke: string };
export type BubbleView = { x: number; y: number; k: number };
export type PlacedBubble = BubbleMapNode & {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  component: number;
  linked: boolean;
  pal: Palette;
  address?: string;
  sold?: number;
  bought?: number;
  isTimeNode?: boolean;
};

export const MUTED_PALETTE: Palette = { fill: "#6a737c", stroke: "#d0d6dc" };
export const LINKED_PALETTES: Palette[] = [
  { fill: "#f2c94c", stroke: "#ffe9a8" },
  { fill: "#5e6ad2", stroke: "#c5caf5" },
  { fill: "#3d9a86", stroke: "#9ee0d0" },
  { fill: "#d97757", stroke: "#f3c2b0" },
  { fill: "#6d8ec7", stroke: "#c5d4ef" },
  { fill: "#9b7eed", stroke: "#ddd6fe" },
];

export const BUBBLEMAP_V2_TOP_HOLDERS = 250;
const TOP_HOLDERS = BUBBLEMAP_V2_TOP_HOLDERS;
const R_MIN = 9;
const R_MAX = 40;
const COLLIDE_PAD = 11;
const COLLIDE_STRENGTH = 0.55;
const COLLIDE_ITERATIONS = 3;
const COLLIDE_BOUNCE = 0.08;
const STRONG_LINK = new Set(["transfer", "jito", "bundle", "same_slot", "magic", "time"]);
export const ALPHA_DECAY = 0.04;
export const ALPHA_MIN = 0.001;
export const FIT_FILL = 0.7;

export function hash01(id: string, salt: string) {
  let h = 2166136261;
  const s = `${id}:${salt}`;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

function gauss(id: string, salt: string) {
  const u = Math.max(hash01(id, `${salt}a`), 1e-6);
  const v = hash01(id, `${salt}b`);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function scaleSqrt(value: number, domainMax: number) {
  const t = Math.sqrt(Math.max(value, 0) / Math.max(domainMax, 1e-9));
  return R_MIN + t * (R_MAX - R_MIN);
}

export function nodeSize(node: BubbleMapNode) {
  if (node.isMagic || node.isTimeNode) return Math.max(node.weight, 0.4);
  return Math.max(node.amount, node.sold ?? 0, node.weight, 0);
}

function radiusFor(node: BubbleMapNode, maxBalance: number) {
  if (node.isMagic || node.isTimeNode) return 7;
  return scaleSqrt(nodeSize(node), maxBalance);
}

function holdsCurrentSupply(node: BubbleMapNode) {
  const amount = Number(node.amount);
  if (Number.isFinite(amount) && amount > 0) return true;
  const share = Number(node.percentage);
  return Number.isFinite(share) && share > 0;
}

export function componentsOf(nodes: BubbleMapNode[], links: BubbleMapLink[], universe: BubbleMapNode[] = nodes) {
  const visible = new Set(nodes.map((node) => node.id));
  const meta = new Map(universe.map((node) => [node.id, node]));
  const parent = new Map(nodes.map((node) => [node.id, node.id]));
  const find = (id: string): string => {
    const next = parent.get(id) ?? id;
    if (next !== id) {
      const root = find(next);
      parent.set(id, root);
      return root;
    }
    return id;
  };
  const union = (a: string, b: string) => {
    if (!visible.has(a) || !visible.has(b)) return;
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent.set(pa, pb);
  };
  for (const link of links) {
    if (!STRONG_LINK.has(link.type)) continue;
    if (!visible.has(link.source) || !visible.has(link.target)) continue;
    union(link.source, link.target);
  }
  const strongMembers = new Map<string, string[]>();
  for (const node of nodes) {
    const root = find(node.id);
    const list = strongMembers.get(root) ?? [];
    list.push(node.id);
    strongMembers.set(root, list);
  }
  const assigned = new Set<string>();
  const groups: string[][] = [];
  for (const members of strongMembers.values()) {
    if (members.length > 1) {
      groups.push(members);
      for (const id of members) assigned.add(id);
    }
  }
  for (const node of nodes) {
    if (!assigned.has(node.id)) groups.push([node.id]);
  }
  const ranked = groups
    .map((members, i) => [`g${i}:${members[0]}`, members] as [string, string[]])
    .sort((a, b) => {
      const aCreator = a[1].some((id) => meta.get(id)?.isCreator);
      const bCreator = b[1].some((id) => meta.get(id)?.isCreator);
      if (aCreator !== bCreator) return aCreator ? -1 : 1;
      return b[1].length - a[1].length;
    });
  const index = new Map<string, number>();
  ranked.forEach((entry, i) => {
    for (const id of entry[1]) index.set(id, i);
  });
  return { index, ranked };
}

function visibleClusterLinks(
  links: BubbleMapLink[],
  visible: Set<string>,
  clusterOf: Map<string, number>,
  linkedIds: Set<string>,
) {
  const seen = new Set<string>();
  const out: BubbleMapLink[] = [];
  for (const link of links) {
    if (!visible.has(link.source) || !visible.has(link.target) || link.source === link.target) continue;
    if (!linkedIds.has(link.source) || !linkedIds.has(link.target)) continue;
    if (clusterOf.get(link.source) !== clusterOf.get(link.target)) continue;
    const [source, target] = link.source < link.target ? [link.source, link.target] : [link.target, link.source];
    const key = `${source}>${target}:${link.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: `link:${source}:${target}`, source, target, type: link.type });
  }
  return out;
}

function paletteForComponent(size: number, rank: number, hasCreator: boolean): Palette {
  if (hasCreator) return LINKED_PALETTES[0];
  if (size <= 1) return MUTED_PALETTE;
  return LINKED_PALETTES[(rank % (LINKED_PALETTES.length - 1)) + 1];
}

export function visibleBubbleMap(data: BubbleMapData | null | undefined, holderCap = TOP_HOLDERS): BubbleMapData | null {
  if (!data) return null;
  const nodesIn = data.nodes ?? [];
  const linksIn = data.links ?? [];
  const usable = nodesIn.filter((node) => {
    if (node.isPool) return false;
    if (node.isMagic || node.isTimeNode) return true;
    return holdsCurrentSupply(node);
  });
  const keep = new Set<string>();
  const ranked = [...usable].sort((a, b) => nodeSize(b) - nodeSize(a));
  for (const node of ranked.slice(0, holderCap)) keep.add(node.id);
  for (const node of usable) {
    if (node.isCreator) keep.add(node.id);
  }
  const nodes = usable.filter((node) => keep.has(node.id));
  const visible = new Set(nodes.map((node) => node.id));
  const { index, ranked: groups } = componentsOf(nodes, linksIn, usable);
  const linkedIds = new Set<string>();
  for (const [, ids] of groups) {
    if (ids.length < 2) continue;
    for (const id of ids) linkedIds.add(id);
  }
  return {
    ...data,
    nodes,
    links: visibleClusterLinks(linksIn, visible, index, linkedIds),
  };
}

export function seedLayout(data: BubbleMapData): PlacedBubble[] {
  const nodesIn = data.nodes ?? [];
  const linksIn = data.links ?? [];
  const maxBalance = Math.max(...nodesIn.map(nodeSize), 0.0001);
  const { index, ranked } = componentsOf(nodesIn, linksIn, nodesIn);
  const sizeByRoot = new Map(ranked.map((entry) => [entry[0], entry[1].length]));
  const creatorRoots = new Set(
    ranked
      .filter((entry) => entry[1].some((id) => nodesIn.find((node) => node.id === id)?.isCreator))
      .map((entry) => entry[0]),
  );
  const nodes: PlacedBubble[] = nodesIn.map((node) => {
    const component = index.get(node.id) ?? 0;
    const root = ranked[component]?.[0] ?? node.id;
    const size = sizeByRoot.get(root) ?? 1;
    const linked = size > 1;
    return {
      ...node,
      r: radiusFor(node, maxBalance),
      component,
      linked,
      pal: paletteForComponent(size, component, node.isCreator || creatorRoots.has(root)),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    };
  });

  const golden = Math.PI * (3 - Math.sqrt(5));
  const isolates = nodes.filter((node) => !node.linked).sort((a, b) => b.r - a.r);
  isolates.forEach((node, i) => {
    const spread = 28 + Math.sqrt(i + 1) * (18 + hash01(node.id, "s") * 8);
    const angle = i * golden + (hash01(node.id, "a") - 0.5) * 0.7;
    node.x = Math.cos(angle) * spread;
    node.y = Math.sin(angle) * spread;
  });

  const linkedGroups = new Map<number, PlacedBubble[]>();
  for (const node of nodes) {
    if (!node.linked) continue;
    const list = linkedGroups.get(node.component) ?? [];
    list.push(node);
    linkedGroups.set(node.component, list);
  }
  let groupIndex = 0;
  for (const members of linkedGroups.values()) {
    const cx = gauss(`g${groupIndex}`, "x") * 150;
    const cy = gauss(`g${groupIndex}`, "y") * 150;
    const ordered = [...members].sort((a, b) => b.r - a.r);
    ordered.forEach((node, i) => {
      const spread = i === 0 ? 0 : 14 + Math.sqrt(i) * (Math.max(node.r, 7) + 8);
      const angle = i * golden + (hash01(node.id, "ga") - 0.5) * 0.6;
      node.x = cx + Math.cos(angle) * spread;
      node.y = cy + Math.sin(angle) * spread;
    });
    groupIndex += 1;
  }

  for (const node of nodes) {
    const angle = Math.atan2(node.y, node.x) || hash01(node.id, "ang") * Math.PI * 2;
    const burst = node.linked ? 0.25 : 0.4;
    const jitter = 0.12;
    node.vx = Math.cos(angle) * burst + (hash01(node.id, "vx") - 0.5) * jitter;
    node.vy = Math.sin(angle) * burst + (hash01(node.id, "vy") - 0.5) * jitter;
  }
  return nodes;
}

export function fitView(nodes: PlacedBubble[], cssW: number, cssH: number, fill = FIT_FILL): BubbleView {
  if (!nodes.length || cssW < 8 || cssH < 8) return { x: cssW / 2 || 0, y: cssH / 2 || 0, k: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    minX = Math.min(minX, node.x - node.r);
    minY = Math.min(minY, node.y - node.r);
    maxX = Math.max(maxX, node.x + node.r);
    maxY = Math.max(maxY, node.y + node.r);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return { x: cssW / 2, y: cssH / 2, k: 1 };
  const bw = Math.max(maxX - minX, 1);
  const bh = Math.max(maxY - minY, 1);
  const k = Math.min(8, Math.max(0.05, Math.min((cssW * fill) / bw, (cssH * fill) / bh)));
  return {
    k,
    x: cssW / 2 - ((minX + maxX) / 2) * k,
    y: cssH / 2 - ((minY + maxY) / 2) * k,
  };
}

export function stepPhysics(nodes: PlacedBubble[], links: BubbleMapLink[], alpha: number, now = 0) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const link of links) {
    const a = byId.get(link.source);
    const b = byId.get(link.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.01;
    const rest = a.r + b.r + 28;
    const stretch = dist - rest;
    const force = stretch * 0.028 * alpha;
    const ux = dx / dist;
    const uy = dy / dist;
    a.vx += ux * force;
    a.vy += uy * force;
    b.vx -= ux * force;
    b.vy -= uy * force;
  }

  for (let iter = 0; iter < COLLIDE_ITERATIONS; iter += 1) {
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-6) {
          dx = hash01(a.id, b.id) - 0.5 || 0.01;
          dy = hash01(b.id, a.id) - 0.5 || 0.01;
          dist = Math.hypot(dx, dy);
        }
        const min = a.r + b.r + COLLIDE_PAD;
        if (dist >= min) continue;
        const force = ((min - dist) / dist) * COLLIDE_STRENGTH * 0.5;
        const mx = dx * force;
        const my = dy * force;
        a.x -= mx;
        a.y -= my;
        a.vx -= mx * COLLIDE_BOUNCE;
        a.vy -= my * COLLIDE_BOUNCE;
        b.x += mx;
        b.y += my;
        b.vx += mx * COLLIDE_BOUNCE;
        b.vy += my * COLLIDE_BOUNCE;
      }
    }
  }

  for (const node of nodes) {
    node.vx += -node.x * 0.0014 * alpha;
    node.vy += -node.y * 0.0014 * alpha;
    const t = now * 0.001;
    const phase = hash01(node.id, "ph") * Math.PI * 2;
    const freq = 0.22 + hash01(node.id, "fq") * 0.28;
    const amp = 0.006 * (0.5 + hash01(node.id, "am"));
    node.vx += Math.cos(t * freq + phase) * amp;
    node.vy += Math.sin(t * freq * 0.73 + phase + 1.1) * amp;
    node.vx *= 0.975;
    node.vy *= 0.975;
    node.x += node.vx;
    node.y += node.vy;
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      node.x = 0;
      node.y = 0;
      node.vx = 0;
      node.vy = 0;
    }
  }
}

export function bubbleHolderStats(nodes: BubbleMapNode[], links: BubbleMapLink[]) {
  const wallets = nodes.filter((node) => node.kind !== "token" && !node.isPool);
  const { ranked } = componentsOf(wallets, links, wallets);
  let isolated = 0;
  let linked = 0;
  let dev = 0;
  for (const [, ids] of ranked) {
    const members = ids
      .map((id) => wallets.find((node) => node.id === id))
      .filter((node): node is BubbleMapNode => Boolean(node));
    if (members.some((node) => node.isCreator || node.clusterKind === "dev")) {
      dev += members.length;
    } else if (ids.length > 1) {
      linked += members.length;
    } else {
      isolated += members.length;
    }
  }
  return { isolated, linked, dev, total: wallets.length };
}

export type HolderListMember = BubbleMapNode & { rank: number; pal: Palette };
export type HolderListGroup = {
  key: string;
  clusterNo: number | null;
  pal: Palette;
  share: number;
  kind: string;
  members: HolderListMember[];
};

export function holderDistribution(nodes: BubbleMapNode[], links: BubbleMapLink[]): HolderListGroup[] {
  const wallets = nodes.filter(
    (node) => node.kind !== "token" && !node.isPool && !node.isMagic && !node.isTimeNode,
  );
  const rankOf = new Map(
    [...wallets]
      .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0) || b.amount - a.amount)
      .map((node, index) => [node.id, node.rank && node.rank > 0 ? node.rank : index + 1]),
  );
  const { ranked } = componentsOf(wallets, links, wallets);
  let clusterNo = 0;
  return ranked
    .map(([, ids], index) => {
      const members = ids
        .map((id) => wallets.find((node) => node.id === id))
        .filter((node): node is BubbleMapNode => Boolean(node))
        .sort((a, b) => (rankOf.get(a.id) ?? 999) - (rankOf.get(b.id) ?? 999));
      const linked = members.length > 1;
      const hasCreator = members.some((node) => node.isCreator);
      const pal = paletteForComponent(members.length, index, hasCreator);
      const kind = hasCreator ? "dev" : linked ? members[0]?.clusterKind || "cluster" : "isolated";
      return {
        key: `g:${members[0]?.id ?? index}`,
        clusterNo: linked ? 0 : null,
        pal,
        share: members.reduce((sum, node) => sum + (node.percentage ?? 0), 0),
        kind,
        members: members.map((node) => ({
          ...node,
          rank: rankOf.get(node.id) ?? 0,
          pal,
        })),
      };
    })
    .sort((a, b) => (a.members[0]?.rank ?? 999) - (b.members[0]?.rank ?? 999))
    .map((group) => {
      if (group.members.length <= 1) return group;
      clusterNo += 1;
      return { ...group, clusterNo };
    });
}
