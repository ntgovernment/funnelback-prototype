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
    const originalBackground = await mainLink.evaluate((node) => getComputedStyle(node).backgroundColor);
    if (width === 1440) expect(mobileMenu).toBe(false);
    await mainLink.click();
    await expect(mainLink.locator("..")).toHaveClass(/active/);
    if (width === 1440) {
      const dropdown = mainLink.locator("..").locator(".menu-wrapper");
      const row = page.locator(".ntgc-header__inner--main > .row");
      const rowBounds = await row.boundingBox();
      const dropdownBounds = await dropdown.boundingBox();
      expect(dropdownBounds.width).toBe(rowBounds.width);
      expect(Math.abs((dropdownBounds.x + dropdownBounds.width / 2) - (rowBounds.x + rowBounds.width / 2))).toBeLessThan(1);
      await expect(dropdown.getByRole("link", { name: "Training and career development" })).toHaveCSS("white-space", "normal");
      await expect(dropdown.getByRole("link", { name: "Training and career development" })).toHaveCSS("overflow-wrap", "anywhere");
    }
    if (!mobileMenu) {
      await expect(mainLink).toHaveCSS("background-color", originalBackground);
      await page.mouse.move(0, 899);
      await expect(mainLink).toHaveCSS("background-color", originalBackground);
      await assertUnderlineOnly(mainLink);
      await expect(mainLink).toHaveCSS("background-color", originalBackground);
    }
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
      await expect(page.locator(".local-type-nav")).toBeHidden();
      await expect(page.locator(".local-type-select")).toBeVisible();
      await page.getByRole("button", { name: "Filter and sort", exact: true }).click();
      const dialog = page.locator(".local-filter-dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveCSS("font-family", "Roboto, sans-serif");
      await expect(dialog.getByLabel("A - Z", { exact: true })).toHaveCSS("width", "24px");
    } else {
      await expect(page.locator(".local-type-nav")).toBeVisible();
      await expect(page.locator(".local-type-select")).toBeHidden();
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

async function hoverShade(control, token = "--clr-bg-shade") {
  return control.evaluate((node, name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    node.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

for (const width of [390, 900, 1440]) {
  test(`main nav search hover matches the page search at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await page.evaluate(() => document.fonts.ready);
    const form = page.locator('form[name="ntgc-search-form"]');
    const input = form.locator("#searchterm");
    const submit = form.locator(".ntgc-search__submit");
    if (width < 1296) await submit.click();
    await expect(input).toBeVisible();
    await page.locator(".ntgc-header__search").evaluate(async (node) => {
      await Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished));
    });
    await page.mouse.move(0, 899);
    const bounds = await input.boundingBox();
    const shade = await hoverShade(form, "--clr-bg-shade-alt");
    const original = await input.evaluate((node) => {
      const style = getComputedStyle(node);
      return { radius: style.borderRadius, color: style.color };
    });
    const buttonBackground = await submit.evaluate((node) => getComputedStyle(node).backgroundColor);
    await expect(input).toHaveCSS("background-color", "rgb(255, 255, 255)");
    for (const control of [input, submit]) {
      await control.hover();
      await expect(input).toHaveCSS("background-color", shade);
      await expect(input).toHaveCSS("border-radius", original.radius);
      await expect(input).toHaveCSS("color", original.color);
      await expect(submit).toHaveCSS("background-color", buttonBackground);
      expect(await input.boundingBox()).toEqual(bounds);
      await page.mouse.move(0, 899);
      await expect(input).toHaveCSS("background-color", "rgb(255, 255, 255)");
    }
    await input.focus();
    const outline = await input.evaluate((node) => getComputedStyle(node).outline);
    await input.hover();
    await expect(input).toHaveCSS("outline", outline);
    await page.screenshot({ path: testInfo.outputPath(`main-nav-search-hover-${width}.png`), animations: "disabled" });
  });
}

for (const width of [390, 1440]) {
  test(`search hover joins both segments without changing focus at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./");
    await page.evaluate(() => document.fonts.ready);
    const input = page.locator("#search");
    const submit = page.locator("#ntgc-site-search .ntgc-search__submit");
    const shade = await hoverShade(page.locator("#ntgc-site-search"), "--clr-bg-shade-alt");
    await page.mouse.move(0, 899);
    const bounds = await input.boundingBox();
    for (const control of [input, submit]) {
      await expect(control).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await control.hover();
      for (const segment of [input, submit]) {
        await expect(segment).toHaveCSS("background-color", shade);
        await expect(segment).toHaveCSS("color", "rgb(16, 32, 64)");
      }
      expect(await input.boundingBox()).toEqual(bounds);
      await page.mouse.move(0, 899);
    }
    await input.focus();
    await input.hover();
    await expect(input).toHaveCSS("outline-width", "3px");
    await expect(input).toHaveCSS("outline-color", "rgb(32, 136, 32)");
    await page.screenshot({ path: testInfo.outputPath(`search-hover-${width}.png`), animations: "disabled" });
    await input.fill("Apply f");
    await page.locator('#search-suggestions [role="option"]').first().hover();
    for (const segment of [input, submit]) await expect(segment).toHaveCSS("background-color", "rgb(255, 255, 255)");
    expect(await page.locator("header, footer").evaluateAll((nodes) => nodes.every((node) => !getComputedStyle(node).getPropertyValue("--clr-bg-shade")))).toBe(true);
  });

  test(`owner hover preserves open and checked states at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./?searchterm=apply");
    if (width < 900) await page.getByRole("button", { name: "Filter and sort", exact: true }).click();
    const owner = page.locator(".local-owner-trigger:visible");
    await owner.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 899);
    const bounds = await owner.boundingBox();
    const original = await owner.evaluate((node) => {
      const style = getComputedStyle(node);
      return { border: style.border, color: style.color };
    });
    const shade = await hoverShade(owner);
    await expect(owner).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await owner.hover();
    await expect(owner).toHaveCSS("background-color", shade);
    await expect(owner).toHaveCSS("border", original.border);
    await expect(owner).toHaveCSS("color", original.color);
    expect(await owner.boundingBox()).toEqual(bounds);
    await owner.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(owner).toBeFocused();
    await page.mouse.move(0, 899);
    const focusOutline = await owner.evaluate((node) => getComputedStyle(node).outline);
    await expect(owner).toHaveCSS("outline-style", "solid");
    await owner.hover();
    await expect(owner).toHaveCSS("outline", focusOutline);
    await owner.click();
    await expect(owner).toHaveAttribute("aria-expanded", "true");
    await page.mouse.move(0, 899);
    const openOutline = await owner.evaluate((node) => getComputedStyle(node).outline);
    await owner.hover();
    await expect(owner).toHaveCSS("background-color", shade);
    await expect(owner).toHaveCSS("outline", openOutline);
    const checkbox = page.locator('.local-owner-options:visible input[type="checkbox"]').first();
    await checkbox.check();
    await checkbox.locator("..").hover();
    await expect(checkbox).toBeChecked();
    const checkedBackground = await checkbox.evaluate((node) => getComputedStyle(node).backgroundColor);
    await owner.hover();
    await expect(checkbox).toBeChecked();
    await expect(checkbox).toHaveCSS("background-color", checkedBackground);
    await page.screenshot({ path: testInfo.outputPath(`owner-hover-${width}.png`), animations: "disabled" });
    await page.mouse.move(0, 899);
    await expect(owner).toHaveCSS("background-color", "rgb(255, 255, 255)");
  });
}

test("search hover and owner hover stay inactive on touch devices", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    await page.goto("./?searchterm=apply");
    expect(await page.evaluate(() => matchMedia("(hover: hover)").matches)).toBe(false);
    const navSearch = page.locator('form[name="ntgc-search-form"]');
    await navSearch.locator(".ntgc-search__submit").click();
    await navSearch.locator("#searchterm").hover();
    await expect(navSearch.locator("#searchterm")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.locator("#search").hover();
    await expect(page.locator("#search")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.locator("#ntgc-site-search .ntgc-search__submit")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.getByRole("button", { name: "Filter and sort", exact: true }).click();
    const owner = page.locator(".local-owner-trigger:visible");
    await owner.hover();
    await expect(owner).toHaveCSS("background-color", "rgb(255, 255, 255)");
  } finally {
    await context.close();
  }
});

for (const width of [900, 1440]) {
  test(`Search result type buttons match square pill states at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("./?searchterm=apply");
    const buttons = page.locator(".local-type-button");
    const selected = buttons.first();
    const target = buttons.nth(1);
    await expect(target).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const colors = await target.evaluate((node) => {
      const style = getComputedStyle(node);
      return Object.fromEntries(["--clr-bg-default", "--clr-bg-shade-alt", "--clr-link-default", "--clr-border-subtle", "--clr-focus-focus", "--clr-action-pirmary", "--clr-text-inverse"].map((name) => {
        const probe = document.createElement("span");
        probe.style.color = style.getPropertyValue(name);
        node.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return [name, color];
      }));
    });
    const assertBorder = async (control) => {
      await expect(control).toHaveCSS("border-radius", "0px");
      await expect(control).toHaveCSS("border-top-width", "1px");
      await expect(control).toHaveCSS("border-top-style", "solid");
      await expect(control).toHaveCSS("border-top-color", colors["--clr-border-subtle"]);
    };
    await page.mouse.move(0, 899);
    await expect(target).toHaveCSS("background-color", colors["--clr-bg-default"]);
    await expect(target).toHaveCSS("color", colors["--clr-link-default"]);
    await expect(target).toHaveCSS("font-family", "Roboto, sans-serif");
    await expect(target).toHaveCSS("font-size", "16px");
    await expect(target).toHaveCSS("font-weight", "400");
    await expect(target).toHaveCSS("line-height", "24px");
    await expect(target).toHaveCSS("padding", "8px 16px");
    await expect(target).toHaveCSS("gap", "8px");
    const icon = target.locator("span").first();
    await expect(icon).toHaveCSS("width", "12px");
    await expect(icon).toHaveCSS("height", "12px");
    await expect(icon).toHaveCSS("font-size", "12px");
    await assertBorder(target);
    const originalBounds = await target.boundingBox();
    await target.hover();
    await expect(target).toHaveCSS("background-color", colors["--clr-bg-shade-alt"]);
    await expect(target).toHaveCSS("color", colors["--clr-link-default"]);
    await assertBorder(target);
    expect(await target.boundingBox()).toEqual(originalBounds);
    await page.mouse.move(0, 899);
    await selected.focus();
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
    await expect(target).toHaveCSS("outline-width", "4px");
    await expect(target).toHaveCSS("outline-style", "solid");
    await expect(target).toHaveCSS("outline-color", colors["--clr-focus-focus"]);
    await expect(target).toHaveCSS("outline-offset", "0px");
    await expect(target).toHaveCSS("background-color", colors["--clr-bg-default"]);
    await assertBorder(target);
    expect(await target.boundingBox()).toEqual(originalBounds);
    await page.screenshot({ path: testInfo.outputPath(`square-pill-focus-${width}.png`), animations: "disabled" });
    await target.click();
    await expect(target).toHaveAttribute("aria-pressed", "true");
    await expect(selected).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".local-type-select")).toHaveValue(await target.getAttribute("data-value"));
    await target.hover();
    await expect(target).toHaveCSS("background-color", colors["--clr-action-pirmary"]);
    await expect(target).toHaveCSS("color", colors["--clr-text-inverse"]);
    await assertBorder(target);
    await page.mouse.move(0, 899);
    await selected.focus();
    await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
    await expect(target).toHaveCSS("outline-color", colors["--clr-focus-focus"]);
    await expect(target).toHaveCSS("outline-width", "4px");
    await expect(target).toHaveCSS("background-color", colors["--clr-action-pirmary"]);
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
