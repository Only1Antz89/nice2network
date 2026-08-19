import { expect, test } from "@playwright/test";

test("N2Select keyboard, reset and viewport placement work across supported browsers", async ({ page }) => {
  await page.goto("/signin?mode=register");
  const select = page.getByRole("combobox", { name: "Title" });

  await select.click();
  await expect(page.getByRole("listbox", { name: "Title" })).toBeVisible();
  await select.press("End");
  await select.press("Enter");
  await expect(select).toContainText("Prof");
  await expect(select).toHaveAttribute("aria-expanded", "false");

  await select.press(" ");
  const listbox = page.getByRole("listbox", { name: "Title" });
  await expect(listbox).toBeVisible();
  const placement = await listbox.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: innerWidth, height: innerHeight };
  });
  expect(placement.left).toBeGreaterThanOrEqual(0);
  expect(placement.right).toBeLessThanOrEqual(placement.width);
  expect(placement.top).toBeGreaterThanOrEqual(0);
  expect(placement.bottom).toBeLessThanOrEqual(placement.height);

  await select.press("Escape");
  await expect(select).toBeFocused();
  await page.locator("form").evaluate(form => (form as HTMLFormElement).reset());
  await expect(select).toContainText("Ms");

  await page.emulateMedia({ colorScheme: "dark" });
  await select.click();
  await expect(listbox).toBeVisible();
  const colours = await listbox.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, colour: style.color };
  });
  expect(colours.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(colours.colour).not.toBe(colours.background);
});
