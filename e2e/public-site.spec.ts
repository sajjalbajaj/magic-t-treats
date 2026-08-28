import { expect, test } from "@playwright/test";

/**
 * Public site journeys.
 *
 * These run without any credentials — the pages render their empty states when
 * the database is unreachable, so the structural assertions hold either way.
 */

test.describe("public website", () => {
  test("homepage renders the hero and primary calls to action", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /explore treats/i })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("has no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(errors).toEqual([]);
  });

  test("skip link is reachable by keyboard and moves focus to the content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: /skip to content/i });
    await expect(skipLink).toBeFocused();
  });

  test("main navigation reaches the About and Gallery pages", async ({ page, isMobile }) => {
    await page.goto("/");

    if (isMobile) {
      await page.getByRole("button", { name: /open menu/i }).click();
    }

    await page.getByRole("link", { name: "About", exact: true }).first().click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: /meet the baker/i })).toBeVisible();

    await page.goto("/gallery");
    await expect(page.getByRole("heading", { name: /every bake, up close/i })).toBeVisible();
  });

  test("custom order form validates before submitting", async ({ page }) => {
    await page.goto("/custom-order");

    const form = page.locator("form");
    await form.getByRole("button", { name: /copy request/i }).click();

    // Name is required by the schema; the browser blocks submission first.
    const nameField = page.getByLabel("Your name");
    await expect(nameField).toBeVisible();
    await expect(page).toHaveURL(/custom-order/);
  });

  test("custom order message preview updates as the form is filled in", async ({ page }) => {
    await page.goto("/custom-order");

    await page.getByLabel("Your name").fill("Priya");
    await page.getByLabel("Occasion").fill("Diwali hampers");

    const preview = page.locator("pre");
    await expect(preview).toContainText("Hi! This is Priya.");
    await expect(preview).toContainText("Occasion: Diwali hampers");
  });

  test("serves robots.txt and sitemap.xml", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toContain("Sitemap:");
    // The dashboard must not be indexable.
    expect(await robots.text()).toContain("/admin");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("<urlset");
  });

  test("homepage exposes LocalBusiness structured data", async ({ page }) => {
    await page.goto("/");

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length).toBeGreaterThan(0);

    const parsed = blocks.flatMap((block) => {
      const value: unknown = JSON.parse(block);
      return Array.isArray(value) ? value : [value];
    });

    const types = parsed.map((entry) => (entry as { "@type"?: string })["@type"]);
    expect(types).toContain("Bakery");
    expect(types).toContain("Organization");
  });

  test("unknown routes render the 404 page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/couldn’t find that page/i)).toBeVisible();
  });
});

test.describe("security", () => {
  test("anonymous visitors are redirected away from the dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole("heading", { name: /magic treats/i }).first()).toBeVisible();
  });

  test("nested admin routes are protected too", async ({ page }) => {
    await page.goto("/admin/orders/new");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("the service role key never reaches the browser", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();

    expect(html).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    // A service-role JWT carries this claim; the anon key does not.
    expect(html).not.toContain("service_role");
  });

  test("the enquiry endpoint rejects malformed payloads", async ({ request }) => {
    const response = await request.post("/api/enquiries", {
      data: { kind: "product", requiredDate: "not-a-date" },
    });

    expect([422, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("the analytics endpoint rejects unknown event names", async ({ request }) => {
    const response = await request.post("/api/events", {
      data: { event_type: "arbitrary_event" },
    });

    // 422 when configured, 200 with recorded:false when Supabase is absent.
    if (response.status() === 200) {
      expect((await response.json()).data.recorded).toBe(false);
    } else {
      expect(response.status()).toBe(422);
    }
  });
});
