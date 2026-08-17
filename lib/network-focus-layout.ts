export type NetworkLayoutPoint = { x: number; y: number };
export type NetworkLayoutRect = { x: number; y: number; width: number; height: number };

export type FocusNetworkLayoutInput = {
  width: number;
  height: number;
  anchor: NetworkLayoutPoint;
  nodeIds: string[];
  obstaclePoints?: NetworkLayoutPoint[];
  reservedRects?: NetworkLayoutRect[];
};

export type FocusNetworkLayout = {
  positions: Record<string, NetworkLayoutPoint>;
  orbit: { rx: number; ry: number };
  spacing: number;
};

const pointInside = (point: NetworkLayoutPoint, rect: NetworkLayoutRect, padding: number) =>
  point.x >= rect.x - padding && point.x <= rect.x + rect.width + padding &&
  point.y >= rect.y - padding && point.y <= rect.y + rect.height + padding;

const farEnough = (point: NetworkLayoutPoint, points: NetworkLayoutPoint[], spacing: number) =>
  points.every((other) => Math.hypot(point.x - other.x, point.y - other.y) >= spacing);

function targetSpacing(width: number, count: number) {
  if (width <= 560) return count > 18 ? 72 : 84;
  if (width <= 900) return count > 28 ? 90 : 104;
  return count > 30 ? 110 : 122;
}
function radialCandidates(
  width: number,
  height: number,
  anchor: NetworkLayoutPoint,
  spacing: number,
  nodeCount: number,
) {
  const candidates: Array<NetworkLayoutPoint & { score: number }> = [],
    centre = { x: width / 2, y: height / 2 },
    outward = Math.atan2(anchor.y - centre.y, anchor.x - centre.x),
    maximumRadius = Math.min(
      Math.hypot(width, height) * .48,
      Math.max(spacing * 2.2, Math.sqrt(Math.max(1, nodeCount)) * spacing * .78),
    ),
    marginX = Math.min(68, Math.max(42, width * .055)),
    marginY = Math.min(64, Math.max(40, height * .065));
  for (let radius = spacing; radius <= maximumRadius; radius += spacing * .82) {
    const count = Math.max(8, Math.ceil(Math.PI * 2 * radius / spacing));
    for (let index = 0; index < count; index += 1) {
      const angle = outward + index / count * Math.PI * 2,
        point = { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius };
      if (point.x < marginX || point.x > width - marginX || point.y < marginY || point.y > height - marginY) continue;
      const inwardPenalty = Math.max(0, Math.cos(angle - outward + Math.PI)),
        score = radius + inwardPenalty * spacing * 1.8 + index * .001;
      candidates.push({ ...point, score });
    }
  }
  return candidates.sort((a, b) => a.score - b.score);
}

function gridCandidates(width: number, height: number, anchor: NetworkLayoutPoint, spacing: number) {
  const candidates: Array<NetworkLayoutPoint & { score: number }> = [],
    centre = { x: width / 2, y: height / 2 };
  for (let y = spacing * .55; y <= height - spacing * .55; y += spacing * .78) {
    for (let x = spacing * .55; x <= width - spacing * .55; x += spacing * .78) {
      const centrePenalty = Math.max(0, spacing * 1.4 - Math.hypot(x - centre.x, y - centre.y));
      candidates.push({ x, y, score: Math.hypot(x - anchor.x, y - anchor.y) + centrePenalty });
    }
  }
  return candidates.sort((a, b) => a.score - b.score);
}

export function layoutFocusedNetwork(input: FocusNetworkLayoutInput): FocusNetworkLayout {
  const width = Math.max(320, input.width), height = Math.max(480, input.height),
    anchor = { x: input.anchor.x / 100 * width, y: input.anchor.y / 100 * height },
    obstacles = (input.obstaclePoints ?? []).map((point) => ({ x: point.x / 100 * width, y: point.y / 100 * height })),
    reserved = input.reservedRects ?? [],
    desiredSpacing = targetSpacing(width, input.nodeIds.length);
  let spacing = desiredSpacing,
    placed: NetworkLayoutPoint[] = [],
    positions: Record<string, NetworkLayoutPoint> = {};

  for (const factor of [1, .92, .84, .76]) {
    spacing = desiredSpacing * factor;
    placed = [];
    positions = {};
    const candidates = [
      ...radialCandidates(width, height, anchor, spacing, input.nodeIds.length),
      ...gridCandidates(width, height, anchor, spacing),
    ];
    for (const id of input.nodeIds) {
      const candidateIndex = candidates.findIndex((point) =>
        !reserved.some((rect) => pointInside(point, rect, spacing * .48)) &&
        farEnough(point, obstacles, spacing * .94) &&
        farEnough(point, placed, spacing),
      );
      if (candidateIndex < 0) break;
      const [candidate] = candidates.splice(candidateIndex, 1);
      const point = { x: candidate.x, y: candidate.y };
      positions[id] = { x: point.x / width * 100, y: point.y / height * 100 };
      placed.push(point);
    }
    if (placed.length === input.nodeIds.length) break;
  }

  input.nodeIds.slice(placed.length).forEach((id, index) => {
    const angle = index / Math.max(1, input.nodeIds.length - placed.length) * Math.PI * 2,
      radius = Math.min(width, height) * .42,
      point = {
        x: Math.min(width - spacing / 2, Math.max(spacing / 2, anchor.x + Math.cos(angle) * radius)),
        y: Math.min(height - spacing / 2, Math.max(spacing / 2, anchor.y + Math.sin(angle) * radius)),
      };
    positions[id] = { x: point.x / width * 100, y: point.y / height * 100 };
    placed.push(point);
  });

  const rx = Math.max(spacing, ...placed.map((point) => Math.abs(point.x - anchor.x))) / width * 100 + 3,
    ry = Math.max(spacing, ...placed.map((point) => Math.abs(point.y - anchor.y))) / height * 100 + 3;
  return { positions, orbit: { rx: Math.min(48, rx), ry: Math.min(48, ry) }, spacing };
}
