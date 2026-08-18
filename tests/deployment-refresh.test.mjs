import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("new deployments load only at deliberate navigation boundaries", async () => {
  const [layout, refresh, route, page, navigation] = await Promise.all([
    read("app/layout.tsx"),
    read("components/deployment-refresh.tsx"),
    read("app/api/version/route.ts"),
    read("app/page.tsx"),
    read("lib/deployment-navigation.ts"),
  ]);

  assert.match(layout, /<DeploymentRefresh initialVersion=\{getDeploymentVersion\(\)\}/);
  assert.match(refresh, /DEPLOYMENT_NAVIGATION_EVENT/);
  assert.doesNotMatch(refresh, /setInterval|visibilitychange|addEventListener\("focus"|addEventListener\("online"/);
  assert.match(refresh, /result\.version !== initialVersion/);
  assert.match(refresh, /window\.location\.reload\(\)/);
  assert.match(navigation, /n2:deployment-navigation/);
  assert.match(page, /if \(next !== view\) signalDeploymentNavigation\(\)/);
  assert.match(page, /function openProject\(projectId: string\)[\s\S]*?signalDeploymentNavigation\(\);[\s\S]*?setSelectedProjectId\(projectId\)/);
  assert.match(route, /dynamic = "force-dynamic"/);
  assert.match(route, /"Cache-Control": "no-store, max-age=0"/);
});

test("Vercel keeps using the Next build while Sites uses Vinext", async () => {
  const [vercel, pkg] = await Promise.all([
    read("vercel.json"),
    read("package.json"),
  ]);
  assert.equal(JSON.parse(vercel).buildCommand, "npm run build:next");
  assert.match(JSON.parse(pkg).scripts.build, /vinext build/);
});
