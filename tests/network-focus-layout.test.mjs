import assert from "node:assert/strict";
import test from "node:test";
import { layoutFocusedNetwork } from "../lib/network-focus-layout.ts";

const scenarios = [1, 5, 15, 30, 52];

for (const count of scenarios) test(`focused network separates ${count} nodes on desktop`, () => {
  const nodeIds = Array.from({ length: count }, (_, index) => `node-${index}`),
    reserved = [{ x: 610, y: 330, width: 720, height: 220 }],
    result = layoutFocusedNetwork({
      width: 1920,
      height: 1000,
      anchor: { x: 50, y: 21 },
      nodeIds,
      obstaclePoints: [{ x: 35, y: 70 }, { x: 65, y: 70 }],
      reservedRects: reserved,
    }),
    points = Object.values(result.positions).map((point) => ({ x: point.x / 100 * 1920, y: point.y / 100 * 1000 }));
  assert.equal(points.length, count);
  for (const point of points) {
    assert.ok(point.x >= 0 && point.x <= 1920 && point.y >= 0 && point.y <= 1000);
    assert.ok(point.x < reserved[0].x - result.spacing * .48 || point.x > reserved[0].x + reserved[0].width + result.spacing * .48 || point.y < reserved[0].y - result.spacing * .48 || point.y > reserved[0].y + reserved[0].height + result.spacing * .48);
  }
  for (let a = 0; a < points.length; a += 1) for (let b = a + 1; b < points.length; b += 1) {
    assert.ok(Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y) >= result.spacing - .01);
  }
  if (count === 15) assert.ok(Math.max(...points.map((point) => Math.hypot(point.x - 960, point.y - 210))) <= 560);
});
test("mobile focus layout avoids the toolbar and bottom sheet", () => {
  const reserved = [{ x: 12, y: 320, width: 366, height: 190 }, { x: 0, y: 540, width: 390, height: 304 }],
    result = layoutFocusedNetwork({
      width: 390,
      height: 844,
      anchor: { x: 50, y: 20 },
      nodeIds: Array.from({ length: 15 }, (_, index) => `mobile-${index}`),
      reservedRects: reserved,
    });
  for (const point of Object.values(result.positions)) {
    const pixel = { x: point.x / 100 * 390, y: point.y / 100 * 844 };
    assert.ok(pixel.x >= 0 && pixel.x <= 390 && pixel.y >= 0 && pixel.y <= 844);
    assert.ok(reserved.every((rect) => pixel.x < rect.x - result.spacing * .48 || pixel.x > rect.x + rect.width + result.spacing * .48 || pixel.y < rect.y - result.spacing * .48 || pixel.y > rect.y + rect.height + result.spacing * .48));
  }
});
