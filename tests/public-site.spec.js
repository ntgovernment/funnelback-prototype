import { test, expect } from "@playwright/test";
import { compileSearchDesignSystem, designSystemSources } from "../scripts/build-search-design-system.js";
import { readFile } from "node:fs/promises";

for (const width of [390, 900, 1440]) {
  test(`Navigation hover only adds an underline at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    const assertUnderlineOnly = async (link) => {
      await page.mouse.move(0, 899);
      const original = await link.evaluate(async (node) => {
        await Promise.all(node.getAnimations().map((animation) => animation.finished));
        const style = getComputedStyle(node);
        return { color: style.color, background: style.backgroundColor };
      });
      await link.hover();
      await expect(link).toHaveCSS("color", original.color);
      await expect(link).toHaveCSS("background-color", original.background);
      const label = link.locator(".ntgc-navigation__label");
      if (await label.count()) {
        await expect(link).toHaveCSS("text-decoration-line", "none");
        await expect(label).toHaveCSS("text-decoration-line", "underline");
        const icon = link.locator(".fa-chevron-down");
        if (await icon.count()) {
          await expect(icon).toHaveCSS("text-decoration-line", "none");
          expect(await icon.evaluate((node) => getComputedStyle(node, "::before").textDecorationLine)).toBe("none");
        } else {
          expect(await link.evaluate((node) => getComputedStyle(node, "::before").textDecorationLine)).toBe("none");
        }
      } else {
        await expect(link).toHaveCSS("text-decoration-line", "underline");
      }
    };

    if (width > 768) {
      await assertUnderlineOnly(page.locator(".ntgc-navigation--utility__list > li > a").first());
      await assertUnderlineOnly(page.locator(".ntgc-navigation--utility__trigger").first());
    }
    const mobileMenu = await page.locator(".toggle-mobile-nav").isVisible();
    if (mobileMenu) {
      await page.locator(".toggle-mobile-nav").click();
    }
    const navigation = page.locator(".ntgc-navigation--main:visible");
    const mainLink = navigation.locator("ul.level-one > li:visible > a").first();
    await assertUnderlineOnly(mainLink);
    await mainLink.click();
    if (!mobileMenu) await assertUnderlineOnly(mainLink);
    await assertUnderlineOnly(navigation.locator("ul.level-two > li > a:visible").first());
  });
}

for (const width of [769, 900, 1440]) {
  test(`Online systems dropdown stays above the main header at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./?searchterm=apply");
    const trigger = page.getByRole("button", { name: "Online systems", exact: true });
    const dropdown = page.locator(".ntgc-utility-dropdown");
    const submenu = page.locator("#online-systems-menu");
    const link = submenu.getByRole("link", { name: "All online systems", exact: true });

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(dropdown).toHaveClass(/is-open/);
    await expect(submenu).toBeVisible();
    await expect(submenu).toHaveCSS("opacity", "1");
    await expect.poll(() => link.evaluate((node) => {
      const bounds = node.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      return node.contains(hit) ? "submenu link" : hit?.outerHTML.slice(0, 250);
    })).toBe("submenu link");
    await link.click({ trial: true });
    const defaultColor = await link.evaluate((node) => getComputedStyle(node).color);
    const defaultBackground = await link.evaluate((node) => getComputedStyle(node).backgroundColor);
    await link.hover();
    await expect(link).toHaveCSS("color", defaultColor);
    await expect(link).toHaveCSS("background-color", defaultBackground);
    await expect(link).toHaveCSS("text-decoration-line", "underline");
    await expect(link).toHaveAttribute("href", "https://ntgcentral.nt.gov.au/online-systems");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`online-systems-${width}.png`), animations: "disabled" });

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(submenu).not.toBeVisible();
    await trigger.click();
    await page.getByRole("heading", { name: "Search", exact: true }).click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(submenu).not.toBeVisible();

    for (const key of ["Enter", "Space"]) {
      await trigger.focus();
      await trigger.press(key);
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await page.keyboard.press("Tab");
      await expect(link).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(submenu).not.toBeVisible();
    }
  });
}

for (const width of [390, 768]) {
  test(`Online systems utility bar remains hidden on mobile at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await expect(page.locator(".ntgc-header__inner--utility")).toBeHidden();
    await expect(page.locator("#online-systems-menu")).toBeHidden();
    await page.locator(".toggle-mobile-nav").click();
    await expect(page.locator(".mobile-quick-links").first()).toBeVisible();
  });
}

for (const width of [320, 390, 900, 1440]) {
  test(`Central tokens resolve without changing the shell at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./?searchterm=apply");
    await expect(page.locator(".local-result").first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const localCss = await readFile(new URL("../Search%20_%20NTG%20Central_files/search-results.css", import.meta.url), "utf8");
    const tokens = [...new Set([...localCss.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]))].filter((token) => token !== "--local-filter-top");
    const missing = await page.locator(".ntgc-local-search, .local-record-dialog").evaluateAll((nodes, names) => nodes.flatMap((node) => names.filter((name) => !getComputedStyle(node).getPropertyValue(name).trim())), tokens);
    expect(missing).toEqual([]);
    const shell = () => page.locator("header, footer, .ntgc-header-search").evaluateAll((nodes) => nodes.map((node) => {
      const style = getComputedStyle(node);
      return Object.fromEntries(["color", "backgroundColor", "fontFamily", "fontSize", "height", "width", "padding", "border", "display"].map((name) => [name, style[name]]));
    }));
    const original = await shell();
    expect(original.length).toBeGreaterThan(0);
    await page.locator('link[href$="search-design-system.css"]').evaluate((node) => { node.disabled = true; });
    expect(await shell()).toEqual(original);
    await page.locator('link[href$="search-design-system.css"]').evaluate((node) => { node.disabled = false; });
    expect(await page.locator("header").first().evaluate((node) => getComputedStyle(node).getPropertyValue("--clr-text-default"))).toBe("");
    if (width < 900) {
      await page.getByRole("button", { name: "Filter and sort", exact: true }).click();
      const dialog = page.locator(".local-filter-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveCSS("font-family", "Roboto, sans-serif");
      await expect(dialog.getByLabel("A - Z", { exact: true })).toHaveCSS("width", "24px");
    } else {
      const category = page.locator('.local-category-group input[type="checkbox"]').first();
      await category.check();
      await expect(page.locator('.local-category-group input[type="checkbox"]').first()).toBeChecked();
      const owner = page.locator(".local-owner-trigger").first();
      await owner.click();
      await expect(page.locator(".local-owner-options").first()).toBeVisible();
      await page.locator('.local-owner-options input[type="checkbox"]').first().check();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`central-${width}.png`), fullPage: width >= 900, animations: "disabled" });
  });
}

test("Central native filter controls match upstream input states", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("./?searchterm=apply");
  const reference = await context.newPage();
  const css = await compileSearchDesignSystem(await designSystemSources(), { scoped: false });
  await reference.setContent(`<html theme="central"><head><style>${css}</style></head><body><label><input type="checkbox"></label><label><input type="radio"></label></body></html>`);
  const properties = ["width", "height", "borderTopWidth", "borderTopColor", "borderRadius", "backgroundColor", "backgroundImage", "backgroundSize", "outlineColor", "outlineWidth", "boxShadow", "pointerEvents"];
  const appearance = async (control) => control.evaluate((node, names) => {
    const style = getComputedStyle(node);
    return Object.fromEntries(names.map((name) => [name, style[name]]));
  }, properties);
  try {
    await page.addStyleTag({ content: "input { transition:none !important; animation:none !important; }" });
    await reference.addStyleTag({ content: "input { box-sizing:border-box; transition:none !important; animation:none !important; }" });
    for (const kind of ["checkbox", "radio"]) {
      const actual = page.locator(`.local-filter-panel input[type="${kind}"]`).first();
      const expected = reference.locator(`input[type="${kind}"]`);
      for (const state of ["default", "checked", "hover", "focus", "disabled", "readonly", "error", "success"]) {
        for (const control of [actual, expected]) await control.evaluate((node, value) => {
          node.blur();
          node.checked = value !== "default";
          node.disabled = value === "disabled";
          node.toggleAttribute("readonly", value === "readonly");
          node.className = ({ hover: "--hover", focus: "--focus", error: "--error --focus", success: "--success --focus" })[value] || "";
        }, state);
        expect(await appearance(actual), `${kind}: ${state}`).toEqual(await appearance(expected));
        if (state === "checked") {
          if (kind === "checkbox") await expect(actual).toHaveCSS("background-size", "19.2px auto");
          else await expect(actual).toHaveCSS("border-top-width", "7px");
        }
      }
      await actual.evaluate((node) => {
        node.className = "";
        node.removeAttribute("readonly");
        node.disabled = false;
        node.focus();
      });
      await expect(actual).toBeFocused();
      await expect(actual).toHaveCSS("outline-width", "4px");
      if (kind === "checkbox") {
        const whitePixels = await actual.evaluate(async (node) => {
          const image = new Image();
          image.src = getComputedStyle(node).backgroundImage.slice(5, -2);
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 24;
          const drawing = canvas.getContext("2d");
          drawing.drawImage(image, 0, 0, 24, 24);
          const pixels = drawing.getImageData(0, 0, 24, 24).data;
          return Array.from({ length: pixels.length / 4 }, (_, index) => index * 4).filter((index) => pixels[index] > 240 && pixels[index + 1] > 240 && pixels[index + 2] > 240 && pixels[index + 3] > 128).length;
        });
        expect(whitePixels).toBeGreaterThan(10);
      }
    }
  } finally {
    await reference.close();
  }
});

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

test("no-results section omits clear all filters", async ({ page }) => {
  await page.goto("./?searchterm=no-matching-results-expected");
  const empty = page.locator(".local-empty");
  await expect(
    empty.getByRole("heading", { name: "No results found" }),
  ).toBeVisible();
  await expect(
    empty.getByRole("button", { name: "Clear all filters" }),
  ).toHaveCount(0);
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
  await dialog.getByLabel("A - Z", { exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog.getByLabel("Relevance", { exact: true })).toBeChecked();
  await dialog.getByLabel("A - Z", { exact: true }).check();
  await dialog.getByRole("button", { name: /^Show \d+ results?$/ }).click();
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await expect(dialog.getByLabel("A - Z", { exact: true })).toBeChecked();
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
    await expect(page.locator("#local-search")).toHaveCSS("min-height", "534px");
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
