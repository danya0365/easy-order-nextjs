import { test, expect } from "@playwright/test";

test("homepage (shop map) renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/ร้านค้าที่ร่วมรายการ/).first()).toBeVisible();
});

test("public shop directory renders", async ({ page }) => {
  await page.goto("/shops");
  await expect(page.getByText("ร้านค้าทั้งหมด").first()).toBeVisible();
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/เข้าสู่ระบบ/).first()).toBeVisible();
});

test("unauthenticated /shop redirects to /login", async ({ page }) => {
  await page.goto("/shop");
  await expect(page).toHaveURL(/\/login/);
});

test("unauthenticated /shop/promote redirects to /login", async ({ page }) => {
  await page.goto("/shop/promote");
  await expect(page).toHaveURL(/\/login/);
});
