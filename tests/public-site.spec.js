import { test, expect } from "@playwright/test";

test("root, original entry, deep links and assets use only approved external requests", async ({
  page,
}) => {
  const errors = [];
  const external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    const approved =
      url.protocol === "https:" && url.hostname.endsWith(".fontawesome.com");
    if (url.origin !== "http://127.0.0.1:4175" && !approved)
      external.push(url.hostname);
  });
  const response = await page.goto("./");
  expect(response.status()).toBe(200);
  await expect(page.locator(".local-popular")).toBeVisible();
  await page.goto("./Search%20_%20NTG%20Central.html?searchterm=apply");
  await expect(page.locator(".local-result").first()).toBeVisible();
  await expect(page.locator("#search")).toHaveValue("apply");
  await page.reload();
  await expect(page.locator(".local-result").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  expect(
    await page
      .locator('.local-result-title[href^="https:"]')
      .first()
      .getAttribute("rel"),
  ).toContain("noopener");
});

test("keyboard autocomplete, local search, details and correction", async ({
  page,
}) => {
  await page.goto("./");
  const input = page.locator("#search");
  await input.fill("Apply f");
  await expect(
    page.locator('#search-suggestions [role="option"]').first(),
  ).toBeVisible();
  await input.press("ArrowDown");
  await input.press("Enter");
  await input.press("Escape");
  await input.press("Enter");
  await expect(page.locator(".local-result").first()).toBeVisible();
  await page.goto("./?searchterm=Apply%20for%20leave");
  const detail = page.locator("button.local-result-title").first();
  await detail.click();
  await expect(page.locator(".local-record-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".local-record-dialog")).not.toBeVisible();
  await expect(detail).toBeFocused();
  await page.goto("./?searchterm=leavve");
  await expect(
    page.getByRole("button", { name: "leave", exact: true }).first(),
  ).toBeVisible();
});

test("mobile filter drafts cancel and apply; contact details are synthetic", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./?searchterm=apply");
  const trigger = page.getByRole("button", {
    name: "Filter and sort",
    exact: true,
  });
  await trigger.click();
  const dialog = page.locator(".local-filter-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("A-Z", { exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel("Relevance", { exact: true })).toBeChecked();
  await dialog.getByLabel("A-Z", { exact: true }).check();
  await dialog.getByRole("button", { name: /^Show \d+ results?$/ }).click();
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await expect(dialog.getByLabel("A-Z", { exact: true })).toBeChecked();
  await page.keyboard.press("Escape");
  await page.goto("./?searchterm=Switchboard");
  await expect(page.locator(".local-result-contact").first()).toContainText(
    "contact-demo@example.org",
  );
  await expect(page.locator(".local-contact-phone")).toHaveCount(0);
});

test("both NTG logos use the supplied font-independent SVG", async ({
  page,
}) => {
  await page.goto("./");
  const logos = page.getByRole("img", { name: "NTG Central", exact: true });
  await expect(logos).toHaveCount(2);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveAttribute(
      "src",
      "./Search _ NTG Central_files/ntg-central-logo.svg",
    );
    await expect(logo).toBeVisible();
    expect(
      await logo.evaluate(
        (node) =>
          node.complete &&
          node.naturalWidth === 86 &&
          node.naturalHeight === 32,
      ),
    ).toBe(true);
  }
  await expect(page.locator(".NTG_CENTRAL")).toHaveCount(0);
  await expect(page.locator('link[href*="typekit.net"]')).toHaveCount(0);
});

for (const width of [320, 390, 900, 1440]) {
  test(`layout and kit icons at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./?searchterm=apply");
    await expect(page.locator(".local-result").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const icon = page.locator(".ntgc-header-search .fa-search");
    await expect
      .poll(() =>
        icon.evaluate(async (node) => {
          if (node.tagName.toLowerCase() === "svg")
            return Boolean(node.querySelector("path"));
          const style = getComputedStyle(node, "::before");
          if (
            ["none", "normal", '""'].includes(style.content) ||
            !/Font Awesome/.test(style.fontFamily)
          )
            return false;
          const fonts = await document.fonts.load(
            `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
            "\uf002",
          );
          return (
            fonts.length > 0 && fonts.every((font) => font.status === "loaded")
          );
        }),
      )
      .toBe(true);
    await expect(page.locator("#mainmenu")).toHaveCount(1);
    await page.screenshot({
      path: testInfo.outputPath(`public-${width}.png`),
      fullPage: true,
    });
  });
}
