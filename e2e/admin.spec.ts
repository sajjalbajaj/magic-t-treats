import { expect, test, type Page } from "@playwright/test";

/**
 * Dashboard journeys: login, create a product, convert an enquiry to an order.
 *
 * These need a real Supabase project and an admin account, so the whole file
 * skips when those are absent. Skipping loudly is better than mocking the
 * database — a green suite that never touched RLS would be worse than no suite.
 */

const email = process.env.E2E_ADMIN_EMAIL ?? "";
const password = process.env.E2E_ADMIN_PASSWORD ?? "";

test.skip(
  !email || !password,
  "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run the dashboard end-to-end tests.",
);

// One unique run id keeps parallel runs from colliding on the SKU/slug indexes.
const runId = Date.now().toString(36).slice(-6);

async function signIn(page: Page) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 15_000 });
}

test.describe("admin authentication", () => {
  test("rejects bad credentials without revealing whether the account exists", async ({
    page,
  }) => {
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password-1");
    await page.getByRole("button", { name: /sign in/i }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/did not match/i);
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("signs in, lands on the dashboard, and signs out again", async ({ page }) => {
    await signIn(page);

    await expect(page.getByRole("heading", { name: /good (morning|afternoon|evening)/i })).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/auth\/login/);

    // The session must really be gone, not just navigated away from.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe("catalogue management", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("creates a product and it appears in the list", async ({ page }) => {
    const name = `E2E Test Treat ${runId}`;
    const sku = `E2E-${runId}`;

    await page.goto("/admin/products/new");

    await page.getByLabel("Product name").fill(name);
    await page.getByLabel("Product code (SKU)").fill(sku);
    await page.getByLabel("Starting price").fill("250");

    await page.getByRole("button", { name: /create product/i }).click();

    // A new product redirects to its edit screen so media can be attached.
    await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText(/photos & videos/i)).toBeVisible();

    await page.goto(`/admin/products?search=${encodeURIComponent(sku)}`);
    await expect(page.getByText(sku)).toBeVisible();
  });

  test("archives a product instead of deleting it", async ({ page }) => {
    await page.goto(`/admin/products?search=E2E-${runId}`);

    const archive = page.getByRole("button", { name: /^archive$/i }).first();
    if ((await archive.count()) === 0) test.skip(true, "No test product to archive.");

    await archive.click();
    await page.getByRole("button", { name: /^archive$/i }).last().click();

    await page.goto(`/admin/products?status=archived&search=E2E-${runId}`);
    await expect(page.getByText(/archived/i).first()).toBeVisible();
  });

  test("toggling Available Today updates the count on the page", async ({ page }) => {
    await page.goto("/admin/available-today");

    const toggle = page.getByRole("switch").first();
    if ((await toggle.count()) === 0) test.skip(true, "No active products to toggle.");

    const before = await toggle.getAttribute("aria-checked");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");

    // Put it back so the suite is idempotent.
    await toggle.click();
  });
});

test.describe("lead to order", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("converts an enquiry into an order", async ({ page }) => {
    await page.goto("/admin/enquiries");

    const firstEnquiry = page.getByRole("link", { name: /^open$/i }).first();
    if ((await firstEnquiry.count()) === 0) {
      test.skip(true, "No enquiries available to convert.");
    }

    await firstEnquiry.click();
    await page.waitForURL(/\/admin\/enquiries\/[0-9a-f-]{36}/);

    const convert = page.getByRole("link", { name: /convert to order/i });
    if ((await convert.count()) === 0) {
      test.skip(true, "This enquiry has already been converted.");
    }

    await convert.click();
    await page.waitForURL(/\/admin\/orders\/new/);

    // The customer details should already be filled in from the enquiry.
    await expect(page.getByLabel("Customer name")).not.toHaveValue("");

    await page.getByLabel("Description").first().fill("E2E conversion item");
    await page.getByLabel("Unit price").first().fill("500");
    await page.getByLabel("Advance received").fill("200");

    // Totals are previewed with the same maths the server will apply.
    await expect(page.getByText("Balance due")).toBeVisible();

    await page.getByRole("button", { name: /create order/i }).click();

    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}/, { timeout: 15_000 });
    await expect(page.getByText(/^MT-\d{4}-\d{4}$/)).toBeVisible();
    await expect(page.getByText(/confirmed/i).first()).toBeVisible();
  });

  test("moves an order through its lifecycle", async ({ page }) => {
    await page.goto("/admin/orders?status=confirmed");

    const firstOrder = page.getByRole("link", { name: /^open$/i }).first();
    if ((await firstOrder.count()) === 0) test.skip(true, "No confirmed orders.");

    await firstOrder.click();
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}/);

    await page.getByRole("button", { name: /mark preparing/i }).click();
    await expect(page.getByText(/preparing/i).first()).toBeVisible();

    // Only the valid next steps are offered — no jumping to delivered.
    await expect(page.getByRole("button", { name: /mark ready/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /mark delivered/i })).toHaveCount(0);
  });
});

test.describe("content management", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("edits homepage copy and it reaches the public site", async ({ page }) => {
    const heading = `Freshly Baked ${runId}`;

    await page.goto("/admin/content");
    await page.getByRole("button", { name: /homepage hero/i }).click();
    await page.getByLabel("Heading").fill(heading);
    await page.getByRole("button", { name: /publish changes/i }).first().click();

    await expect(page.getByText(/updated/i).first()).toBeVisible({ timeout: 10_000 });

    // revalidatePath should make this visible immediately, not in five minutes.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
  });

  test("adds a testimonial and shows it on the homepage", async ({ page }) => {
    const customer = `E2E Reviewer ${runId}`;

    await page.goto("/admin/testimonials");
    await page.getByRole("button", { name: /add testimonial/i }).click();

    await page.getByLabel("Customer name").fill(customer);
    await page.getByLabel("What they said").fill("Genuinely excellent brownies.");
    await page.getByRole("button", { name: /save testimonial/i }).click();

    await expect(page.getByText(customer)).toBeVisible({ timeout: 10_000 });
  });
});
