import { expect, test } from "@playwright/test";

test("a new member can register, onboard, sign in, and reach protected features", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@nice2.test`;
  const password = "UsefulPeople!2026";

  await page.goto("/signin?mode=register");
  await page.getByLabel("Title").selectOption("Mx");
  await page.getByLabel("Date of birth").fill("1992-04-18");
  await page.getByLabel("First name").fill("Morgan");
  await page.getByLabel("Surname").fill("Testwell");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: /Create account/ }).click();

  await expect(page).toHaveURL(/\/onboarding/);
  const activeSlide = () => page.locator('.onboarding-slide:not([aria-hidden="true"])');
  await activeSlide().getByLabel("Profession").fill("Product designer");
  await activeSlide().getByLabel("Industry").fill("Climate technology");
  await activeSlide().getByLabel("Short bio").fill("Designing useful products with communities and practical delivery teams.");
  await activeSlide().getByRole("button", { name: "Continue" }).click();

  await activeSlide().getByLabel("Primary skill").fill("Product strategy");
  await activeSlide().getByLabel("Secondary skill").fill("User research");
  await activeSlide().getByLabel("Tertiary skill").fill("Prototyping");
  await activeSlide().getByRole("button", { name: "Continue" }).click();

  await activeSlide().getByLabel("Interests").fill("Climate, local communities");
  await activeSlide().getByLabel("Location").fill("London, UK");
  await activeSlide().getByLabel("Preferred working style").selectOption("hybrid");
  await activeSlide().getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Start with people who make sense." })).toBeVisible();
  await page.getByRole("button", { name: "See project suggestions" }).click();
  await page.getByRole("link", { name: /Complete sign up/ }).click();

  await expect(page).toHaveURL(/\/signin/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Projects" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Filters" })).toBeVisible();
  await page.getByRole("button", { name: "Projects" }).click();
  await expect(page.getByRole("heading", { name: /Projects/ })).toBeVisible();
});
