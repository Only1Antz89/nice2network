import { expect, test } from "@playwright/test";

const ipadSizes = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 834, height: 1194 },
  { width: 1194, height: 834 },
];

test("tablet mode reflows by orientation without horizontal clipping", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-device-class", "tablet");

  for (const size of ipadSizes) {
    await page.setViewportSize(size);
    const portrait = size.height > size.width;
    await expect(page.locator(".mobile-nav")).toBeVisible({ visible: portrait });
    await expect(page.locator(".sidebar")).toBeVisible({ visible: !portrait });

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  }
});

test("tablet typography and controls meet the comfortable sizing floor", async ({ page }) => {
  await page.goto("/");
  const sizes = await page.evaluate(() => {
    const fixture = document.createElement("section");
    fixture.innerHTML = "<p>Body copy</p><small>Supporting copy</small><input aria-label='Tablet input'><button>Action</button>";
    document.body.append(fixture);
    const result = {
      body: parseFloat(getComputedStyle(fixture.querySelector("p")!).fontSize),
      support: parseFloat(getComputedStyle(fixture.querySelector("small")!).fontSize),
      input: parseFloat(getComputedStyle(fixture.querySelector("input")!).fontSize),
      inputHeight: fixture.querySelector("input")!.getBoundingClientRect().height,
      buttonHeight: fixture.querySelector("button")!.getBoundingClientRect().height,
    };
    fixture.remove();
    return result;
  });

  expect(sizes.body).toBeGreaterThanOrEqual(14);
  expect(sizes.support).toBeGreaterThanOrEqual(12);
  expect(sizes.input).toBeGreaterThanOrEqual(16);
  expect(sizes.inputHeight).toBeGreaterThanOrEqual(44);
  expect(sizes.buttonHeight).toBeGreaterThanOrEqual(44);
});

test("a keyboard-constrained tablet project dialog keeps content and actions reachable", async ({ page }) => {
  await page.goto("/");
  const bounds = await page.evaluate(() => {
    document.documentElement.style.setProperty("--tablet-visual-viewport-height", "560px");
    document.documentElement.style.setProperty("--tablet-visual-viewport-offset-top", "20px");
    document.documentElement.style.setProperty("--tablet-keyboard-inset", "360px");
    document.documentElement.dataset.tabletKeyboard = "open";

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <section class="project-modal" role="dialog">
        <div class="modal-head"><button aria-label="Close">×</button><span>New project</span><span>1/3</span></div>
        <div class="modal-content">
          <div style="height:500px">Project fields</div>
          <textarea aria-label="Project summary">A useful project</textarea>
          <button class="primary-button wide project-plan-button">Build my project plan</button>
        </div>
      </section>`;
    document.body.append(backdrop);
    const modal = backdrop.querySelector<HTMLElement>(".project-modal")!;
    const content = backdrop.querySelector<HTMLElement>(".modal-content")!;
    const action = backdrop.querySelector<HTMLElement>(".project-plan-button")!;
    content.scrollTop = content.scrollHeight;
    const modalRect = modal.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const result = {
      modalTop: modalRect.top,
      modalBottom: modalRect.bottom,
      actionBottom: actionRect.bottom,
      scrollable: content.scrollHeight > content.clientHeight,
      viewportHeight: getComputedStyle(document.documentElement).getPropertyValue("--tablet-visual-viewport-height").trim(),
      modalMaxHeight: getComputedStyle(modal).maxHeight,
    };
    backdrop.remove();
    return result;
  });

  expect(bounds.modalTop).toBeGreaterThanOrEqual(20);
  expect(bounds.viewportHeight).toBe("560px");
  expect(bounds.modalMaxHeight).toBe("536px");
  expect(bounds.modalBottom).toBeLessThanOrEqual(580);
  expect(bounds.actionBottom).toBeLessThanOrEqual(568);
  expect(bounds.scrollable).toBe(true);
});
