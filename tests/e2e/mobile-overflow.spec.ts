import { expect, test } from "@playwright/test";

test("landing has no width spike during its entrance animation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  const samples = await page.evaluate(async () => {
    const widths: number[] = [];
    for (let frame = 0; frame < 75; frame += 1) {
      widths.push(
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      );
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    }
    return widths;
  });
  expect(Math.max(...samples), JSON.stringify(samples)).toBeLessThanOrEqual(
    320,
  );
});

test("landing fits widths around its layout breakpoints", async ({ page }) => {
  const failures: Array<{
    locale: string;
    width: number;
    scrollWidth: number;
  }> = [];
  for (const locale of ["en", "si"]) {
    await page.goto(`/${locale}`);
    for (const width of [280, 300, 320, 390, 450, 640, 768, 1024, 1200]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(550);
      const scrollWidth = await page.evaluate(() =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      );
      if (scrollWidth > width) failures.push({ locale, width, scrollWidth });
    }
  }
  expect(failures).toEqual([]);
});

test("other public pages fit narrow and tablet viewports", async ({ page }) => {
  const failures: Array<{ path: string; width: number; scrollWidth: number }> =
    [];
  for (const path of ["/en/auth", "/si/auth", "/en/forbidden"]) {
    for (const width of [280, 320, 390, 768]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(path);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const scrollWidth = await page.evaluate(() =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
      );
      if (scrollWidth > width) failures.push({ path, width, scrollWidth });
    }
  }
  expect(failures).toEqual([]);
});
