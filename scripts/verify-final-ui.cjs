const { chromium } = require(process.env.NEX_PLAYWRIGHT_MODULE || "playwright");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const root = process.cwd(),
  origin = "http://127.0.0.1:5184";
const server = spawn(
  "node",
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5184",
    "--config",
    "tests/nex-browser.vite.mjs",
  ],
  {
    cwd: root,
    env: { ...process.env, VITE_NEXOS_DEMO: "true" },
    stdio: "ignore",
  },
);
(async () => {
  let browser, page;
  try {
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    browser = await chromium.launch({
      executablePath: process.env.NEX_CHROMIUM_PATH,
      headless: true,
      args: ["--no-sandbox", "--no-zygote"],
    });
    page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      reducedMotion: "no-preference",
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://**", (r) => r.abort());
    await page.route("**/src/context/NexusContext.tsx", async (route) => {
      const response = await route.fetch();
      let s = await response.text();
      assert.match(s, /routines: \[\],/);
      s = s.replace(
        /routines: \[\],/,
        `routines: [{id:'routine-qa',name:'Abertura orbital',is_active:true,days_of_week:[],period:'anytime',description:'Etapas de QA',routine_items:[{id:'step-one',title:'Separar material',sort_order:1,xp_reward:5,duration_minutes:2,is_optional:false},{id:'step-two',title:'Revisar o plano',sort_order:2,xp_reward:5,duration_minutes:3,is_optional:false}]}],`,
      );
      s = s
        .replace(
          /id: mission.id,/,
          'id: mission.id === "mission-1" ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" : mission.id,',
        )
        .replace(
          /duration_minutes: Number.parseInt\(mission.duration\),/,
          "duration_minutes: 20,",
        );
      await route.fulfill({ response, body: s });
    });
    await page.route("**/src/lib/nex-api.ts", async (route) => {
      const response = await route.fetch();
      let s = await response.text();
      const from = /(async function nexRequest\([^]*?\) \{)/;
      assert.match(s, from);
      s = s.replace(
        from,
        "$1\n if(window.__finalMock) return window.__finalMock(path,input,method,signal);",
      );
      await route.fulfill({ response, body: s });
    });
    await page.addInitScript(() => {
      window.__finalCalls = [];
      window.__finalMock = async (path, input) => {
        window.__finalCalls.push({ path, input });
        if (path === "status")
          return {
            providers: { groq: true, gemini: false, workers: false },
            google: null,
            dailyPerProvider: 25,
          };
        if (path === "memories") return [];
        if (path === "operations/preview")
          return {
            operation: input.operation,
            before: null,
            label: "Alterar missão",
            warning: "Confira o estado.",
          };
        if (path === "operations/execute")
          return {
            applied: true,
            id: input.operation.payload.id,
            kind: input.operation.kind,
            area: "missoes",
          };
        if (path === "chat") throw Error("Unexpected model call");
        return {};
      };
    });
    await page.clock.setFixedTime(new Date("2026-10-14T12:00:00Z"));
    await page.goto(origin + "/planejamento");
    await page
      .getByRole("heading", { name: "O que cabe agora?", exact: true })
      .waitFor();
    const overlaps = (a, b) =>
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
    const toggle = page.getByRole("button", {
        name: "Expandir menu inferior",
        exact: true,
      }),
      capture = page.getByRole("button", {
        name: "Captura rápida",
        exact: true,
      });
    assert.equal(
      overlaps(await toggle.boundingBox(), await capture.boundingBox()),
      false,
    );
    await toggle.click();
    await page.waitForTimeout(250);
    assert.equal(
      overlaps(
        await page
          .getByRole("button", { name: "Recolher menu inferior", exact: true })
          .boundingBox(),
        await capture.boundingBox(),
      ),
      false,
      "expanded menu controls must not overlap",
    );
    await capture.click();
    await page
      .getByRole("dialog", { name: "Captura rápida", exact: true })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#nex-mobile-dock").evaluate((n) => n.inert),
      false,
      "modal Escape must not collapse the menu",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator("#nex-mobile-dock")
        .evaluate(
          (n) =>
            n.inert &&
            !n.hidden &&
            n.getAnimations().some((a) => a.playState === "running"),
        ),
      true,
      "closing is inert immediately and stays visible for its short exit",
    );
    await page.waitForFunction(
      () => {
        const n = document.querySelector("#nex-mobile-dock");
        return n.hidden && n.inert;
      },
      null,
      { timeout: 5000 },
    );
    // Rapid keyboard reversals preserve the final choice; reduced motion settles an in-flight transition.
    await toggle.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(30);
    await page.keyboard.press("Enter");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(50);
    assert.equal(
      await page
        .locator("#nex-mobile-dock")
        .evaluate(
          (n) =>
            !n.hidden &&
            !n.inert &&
            n.getAnimations().every((a) => a.playState !== "running"),
        ),
      true,
    );
    await page
      .getByRole("button", { name: "Recolher menu inferior", exact: true })
      .click();
    assert.equal(
      await page
        .locator("#nex-mobile-dock")
        .evaluate((n) => n.hidden && n.inert),
      true,
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const card = page.locator(".execution-workbench");
    const box = await card.boundingBox();
    await page.mouse.move(box.x + 25, box.y + 30);
    await page.waitForTimeout(200);
    assert.equal(await card.getAttribute("data-refraction"), "active");
    assert.ok(
      await card.evaluate(
        (n) => n.style.getPropertyValue("--refraction-x").length > 0,
      ),
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(50);
    await page.waitForFunction(
      () =>
        document
          .querySelector(".execution-workbench")
          ?.getAttribute("data-refraction") === null,
    );
    assert.equal(
      await card
        .locator(".visor-texture")
        .evaluate((n) => getComputedStyle(n, "::after").display),
      "none",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    await page.mouse.move(box.x + 45, box.y + 45);
    await page.waitForTimeout(100);
    await page.waitForFunction(
      () =>
        document
          .querySelector(".execution-workbench")
          ?.getAttribute("data-refraction") === null,
    );
    assert.equal(
      await card.evaluate((n) => getComputedStyle(n).backdropFilter),
      "none",
    );
    await cdp.send("Emulation.setEmulatedMedia", { features: [] });
    console.log(
      "A09: mobile controls, interruption, reduced motion/transparency and optical layer passed",
    );
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "N.E.X", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Comandos e janelas", exact: true })
      .click();
    const help = page.getByRole("dialog", {
      name: "Comandos sem IA",
      exact: true,
    });
    const search = help.getByRole("searchbox", {
      name: "Buscar comandos do N.E.X",
    });
    await search.fill("inexistenteausente");
    await help
      .getByText("Nenhum comando encontrado.", { exact: false })
      .waitFor();
    await search.fill("BLOQUEAR MISSAO");
    assert.equal(await help.locator(".nex-command-card").count(), 1);
    await help.locator(".nex-command-card").click();
    const title = help.getByRole("textbox", {
      name: "Título do item",
      exact: true,
    });
    assert.equal(await title.inputValue(), "");
    assert.equal(
      await help
        .getByRole("button", { name: "Preparar revisão", exact: true })
        .isEnabled(),
      false,
    );
    await title.fill("Revisar neurofisiologia por 45 min");
    await help
      .getByRole("button", { name: "Preparar revisão", exact: true })
      .click();
    const approval = page.getByRole("dialog", {
      name: "Aprovação · Editar missão",
      exact: true,
    });
    await approval.waitFor();
    assert.equal(
      (await page.evaluate(() => window.__finalCalls)).filter(
        (c) => c.path === "operations/execute" || c.path === "chat",
      ).length,
      0,
    );
    // A proposed edit remains reviewable rather than executing a sample title from the command library.
    await approval
      .getByRole("button", { name: "Revisar proposta", exact: true })
      .click();
    await approval
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__finalCalls)).filter(
        (c) => c.path === "operations/execute",
      ).length,
      0,
    );
    const closeWindows = async () => {
      for (
        let i = 0;
        i < 6 && (await page.locator(".nex-window-close").count());
        i++
      )
        await page.locator(".nex-window-close").last().click();
    };
    await closeWindows();
    const send = async (text) => {
      const input = page.getByRole("textbox", {
        name: "Sua mensagem",
        exact: true,
      });
      await input.fill(text);
      await input.press("Control+Enter");
    };
    await send("Rotinas de hoje");
    const routines = page.getByRole("dialog", {
      name: "Rotinas de hoje",
      exact: true,
    });
    await routines
      .getByText("Próxima ação: Separar material", { exact: true })
      .waitFor();
    await routines
      .getByRole("button", { name: "Abrir rotina", exact: true })
      .click();
    await page.waitForURL("**/rotinas?routine=routine-qa");
    await closeWindows();
    await page
      .getByRole("complementary", { name: "Etapas da rotina", exact: true })
      .getByRole("heading", { name: /Abertura orbital/ })
      .waitFor();
    await page.getByRole("button", { name: /Separar material/ }).click();
    await page
      .locator(".routine-next-step")
      .getByText("Revisar o plano", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Fechar rotina", exact: true })
      .click();
    // The same deep link can reopen its inspector, without a route change.
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "N.E.X", exact: true })
      .click();
    await send("Rotinas de hoje");
    await page
      .getByRole("dialog", { name: "Rotinas de hoje", exact: true })
      .getByText("Próxima ação: Revisar o plano", { exact: true })
      .waitFor();
    await page
      .getByRole("dialog", { name: "Rotinas de hoje", exact: true })
      .getByRole("button", { name: "Abrir rotina", exact: true })
      .click();
    await closeWindows();
    await page
      .getByRole("complementary", { name: "Etapas da rotina", exact: true })
      .waitFor();
    console.log(
      "A09: searchable command library, blank personal fields, confirmation boundary and exact routine/next-step links passed",
    );
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "N.E.X", exact: true })
      .click();
    await send("Mostre missões");
    const missions = page.getByRole("dialog", { name: "Missões", exact: true });
    await missions
      .getByRole("button", { name: "Preparar foco", exact: true })
      .first()
      .click();
    await page.waitForURL("**/foco?**");
    assert.match(page.url(), /minutes=20/);
    await closeWindows();
    await page.waitForFunction(
      () =>
        document.querySelector(".focus-clock span")?.textContent === "20:00",
    );
    assert.equal(
      (await page.evaluate(() => window.__finalCalls)).filter(
        (c) => c.path === "operations/execute" || c.path === "chat",
      ).length,
      0,
    );
    // Normal/reversed motion was exercised above. Capture settled, static compositions.
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Visual matrix, including the expanded menu. Theme is applied after each navigation.
    for (const width of [320, 390, 834, 1440])
      for (const theme of ["dark", "light"])
        for (const route of ["planejamento", "rotinas", "nex"]) {
          await page.setViewportSize({
            width,
            height: width < 720 ? 844 : 1000,
          });
          await page.goto(origin + "/" + route);
          await page.locator(".page-content").waitFor();
          await page.evaluate(
            (t) => (document.documentElement.dataset.theme = t),
            theme,
          );
          if (route === "nex") {
            await page
              .getByRole("button", { name: "Comandos e janelas", exact: true })
              .click();
            await page
              .getByRole("dialog", { name: "Comandos sem IA", exact: true })
              .getByRole("heading", {
                name: "O essencial, sem IA.",
                exact: true,
              })
              .waitFor();
          }
          if (
            width <= 920 &&
            route === "planejamento" &&
            (await page
              .getByRole("button", {
                name: "Expandir menu inferior",
                exact: true,
              })
              .count())
          )
            await page
              .getByRole("button", {
                name: "Expandir menu inferior",
                exact: true,
              })
              .click();
          await page.waitForTimeout(250);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${route}/${width}/${theme} overflow`,
          );
          if (width <= 920 && route === "planejamento")
            assert.equal(
              overlaps(
                await page.locator(".mobile-dock-toggle").boundingBox(),
                await page.locator(".floating-add").boundingBox(),
              ),
              false,
            );
          if (route === "nex" && width === 1440 && theme === "dark")
            await page.screenshot({
              path: root + "/docs/design/previews/a09-commands-dark-1440.jpg",
              type: "jpeg",
              quality: 85,
            });
          if (route === "planejamento" && width === 390 && theme === "light")
            await page.screenshot({
              path: root + "/docs/design/previews/a09-menu-light-390.jpg",
              type: "jpeg",
              quality: 85,
            });
        }
    assert.deepEqual(errors, []);
    console.log(
      "A09 final UI: 24 page/width/theme compositions, menu geometry/presence/keyboard, glass preferences, command discovery, routine continuity and exact local Focus with zero inference/execution passed.",
    );
  } catch (e) {
    if (page) {
      console.error(
        await page
          .locator("body")
          .innerText()
          .catch(() => ""),
      );
      await page
        .screenshot({ path: root + "/../a09-failure.jpg" })
        .catch(() => {});
    }
    throw e;
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
