import { expect, test } from "@playwright/test";
import { E2E_STUDENT } from "./fixtures";

test("public landing page exposes authentication entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "A clearer route to your next academic opportunity." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create free account" })).toBeVisible();

  await page.getByRole("link", { name: "Sign in" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("anonymous dashboard access redirects to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("verified completed student can sign in and reach the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_STUDENT.email);
  await page.getByLabel("Password").fill(E2E_STUDENT.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Welcome back, E2E" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find professors" })).toBeVisible();
});
