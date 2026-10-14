const { chromium } = require(process.env.NEX_PLAYWRIGHT_MODULE || "playwright");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const root = process.cwd();
const server = spawn(
  "node",
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5182",
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
        if ((await fetch("http://127.0.0.1:5182")).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    browser = await chromium.launch({
      executablePath: process.env.NEX_CHROMIUM_PATH,
      headless: true,
      args: ["--no-sandbox"],
    });
    page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://**", (r) => r.abort());
    await page.route("**/src/lib/nex-api.ts", async (route) => {
      const response = await route.fetch();
      let s = await response.text();
      s = s.replace(
        /(async function nexRequest\([^]*?\) \{)/,
        "$1\n if (window.__nexMock) return window.__nexMock(path,input,method,signal);",
      );
      await route.fulfill({ response, body: s });
    });
    await page.addInitScript(() => {
      window.__nexCalls = [];
      window.__nexMemories = [];
      window.__nexFail = false;
      window.__nexMock = async (path, input, method, signal) => {
        window.__nexCalls.push({ path, input, method });
        await new Promise((r, j) => {
          const timer = setTimeout(r, 150);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            j(new Error("Aborted"));
          });
        });
        if (window.__nexFail && path === "chat")
          throw Error("Cota preventiva atingida. Aguarde.");
        if (path === "status")
          return {
            providers: { groq: true, gemini: false, workers: false },
            google: window.__nexGoogle
              ? { scopes: ["https://www.googleapis.com/auth/drive.file"] }
              : null,
            dailyPerProvider: 25,
          };
        if (path === "memories") {
          if (method === "POST") {
            window.__nexMemories.push({
              id: "m-memory",
              module: input.module,
              agent: "N.E.X",
              content: input.content,
            });
            return { saved: true };
          }
          if (method === "DELETE") {
            window.__nexMemories = [];
            return { deleted: true };
          }
          return window.__nexMemories;
        }
        if (path === "operations/preview")
          return {
            operation: input.operation,
            before: null,
            label: "Criar projeto",
            warning: "Revise os campos.",
          };
        if (path === "operations/execute")
          return {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            kind: input.operation.kind,
            area: "projetos",
            applied: true,
          };
        if (path === "transcribe")
          return { text: window.__voiceTranscript || "Pergunta de voz" };
        if (path === "chat" && input.message === "Pergunta de voz")
          return {
            reply: "Resposta de voz simulada.",
            provider: "groq",
            proposal: null,
          };
        if (path === "chat" && window.__nexGooglePanel)
          return {
            reply: "Confira os arquivos autorizados.",
            provider: "groq",
            proposal: null,
            panels: [{ area: "biblioteca", google: "drive" }],
          };
        if (path === "chat" && window.__nexAdvanced)
          return {
            reply: "Confira o projeto proposto.",
            provider: "groq",
            proposal: null,
            operation: {
              kind: "project.create",
              payload: { name: "Projeto orbital" },
            },
            panels: [{ area: "hoje" }],
          };
        if (path === "chat")
          return {
            reply: "Posso criar esta missão. Confira antes de confirmar.",
            provider: "groq",
            model: "openai/gpt-oss-20b",
            proposal: { kind: "mission", title: "Revisar Matemática" },
            contextShared: input.shareContext,
          };
        if (path === "actions")
          return { id: "m-created", applied: true, kind: input.kind };
        if (path === "context")
          return {
            module: input.module,
            records: [{ id: "m1", title: "Revisar Física", status: "A fazer" }],
            limited: true,
          };
        if (path === "google/read") {
          if (input.service === "drive")
            return {
              service: "drive",
              data: {
                files: [
                  {
                    id: "file-authorized",
                    name: "Documento autorizado",
                    mimeType: "application/vnd.google-apps.document",
                  },
                ],
              },
            };
          if (input.service === "docs")
            return {
              service: "docs",
              data: {
                title: "Documento autorizado",
                body: {
                  textRun: { content: "Texto retornado pelo leitor simulado." },
                },
              },
            };
          return {
            service: input.service,
            data: { items: [{ summary: "Reunião", id: "event" }] },
          };
        }
        return {};
      };
    });
    await page.goto("http://127.0.0.1:5182/nex");
    await page.locator(".nex-console").waitFor();
    await page.getByText("groq", { exact: true }).waitFor();
    // Verify injected mock actually intercepts, rather than hiding real backend errors.
    assert.ok(
      (await page.evaluate(() => window.__nexCalls)).some(
        (c) => c.path === "status",
      ),
    );
    assert.ok(
      await page
        .locator(".nex-hologram")
        .evaluate((e) => e.width > 0 && e.height > 0),
    );
    const constellation = () =>
      page.locator(".nex-hologram").evaluate((e) => e.toDataURL());
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(
      () => (document.documentElement.dataset.atmosphere = "active"),
    );
    await page.waitForTimeout(100);
    const moving = await constellation();
    await page.waitForTimeout(120);
    assert.notEqual(
      await constellation(),
      moving,
      "constellation must move when enabled",
    );
    await page.evaluate(
      () => (document.documentElement.dataset.atmosphere = "paused"),
    );
    await page.waitForTimeout(100);
    const paused = await constellation();
    await page.waitForTimeout(120);
    assert.equal(
      await constellation(),
      paused,
      "global atmosphere pause must stop canvas",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(
      () => (document.documentElement.dataset.atmosphere = "active"),
    );
    await page.waitForTimeout(100);
    const reduced = await constellation();
    await page.waitForTimeout(120);
    assert.equal(
      await constellation(),
      reduced,
      "reduced motion must stop canvas",
    );
    const geometry = await page.evaluate(() => ({
      sidebar: document.querySelector(".sidebar").getBoundingClientRect().width,
      topbar: document.querySelector(".topbar").getBoundingClientRect().height,
      rails: document.querySelectorAll(".workspace-rail").length,
    }));
    assert.ok(
      geometry.sidebar <= 65 && geometry.topbar <= 57 && geometry.rails === 1,
      JSON.stringify(geometry),
    );
    await page
      .getByRole("button", { name: "Preferências de aparência" })
      .click();
    const preferences = page.getByRole("dialog", { name: "Seu ambiente" });
    await preferences.waitFor();
    await preferences
      .getByRole("button", { name: /Usar tema claro|Usar tema escuro/ })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#root").evaluate((e) => e.inert), false);
    for (const theme of ["dark", "light"])
      for (const width of [320, 390, 834, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(
          (t) => (document.documentElement.dataset.theme = t),
          theme,
        );
        await page.waitForTimeout(100);
        const overflow = await page.evaluate(() => ({
          body: document.body.scrollWidth,
          doc: document.documentElement.scrollWidth,
          width: innerWidth,
        }));
        assert.ok(
          overflow.body <= width + 1 && overflow.doc <= width + 1,
          JSON.stringify({ theme, width, overflow }),
        );
        if (
          (theme === "dark" && width === 1440) ||
          (theme === "light" && width === 390)
        )
          await page.screenshot({
            path: root + `/../a06-console-${theme}-${width}.jpg`,
            fullPage: true,
            type: "jpeg",
            quality: 80,
          });
      }
    await page.setViewportSize({ width: 390, height: 1000 });
    await page
      .getByRole("button", { name: "Expandir menu inferior", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Recolher menu inferior", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("navigation", { name: "Navegação móvel" })
        .isVisible(),
      false,
    );
    await page.reload();
    await page.locator(".nex-console").waitFor();
    await page
      .getByRole("button", { name: "Expandir menu inferior", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("navigation", { name: "Navegação móvel" })
        .isVisible(),
      true,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    const closeWindows = async () => {
      while (await page.locator(".nex-floating-window:visible").count()) {
        await page
          .locator(".nex-floating-window:visible")
          .last()
          .getByRole("button", { name: /^Fechar / })
          .click();
      }
    };
    async function verifyBridges() {
      const chatsBeforeBridges = (
        await page.evaluate(() => window.__nexCalls)
      ).filter((c) => c.path === "chat").length;
      await page
        .locator(".sidebar")
        .getByRole("button", { name: "Calendário", exact: true })
        .click();
      await page
        .getByRole("navigation", { name: "Instrumentos conectados" })
        .getByRole("button", { name: "Preparar ação", exact: true })
        .click();
      const calendarDraft = page.getByRole("dialog", {
        name: "Criar · Calendário",
        exact: true,
      });
      await calendarDraft
        .getByRole("textbox", { name: "Título", exact: true })
        .fill("Compromisso preparado localmente");
      await calendarDraft
        .getByLabel("Início · São Paulo")
        .fill("2026-10-20T10:00");
      await calendarDraft
        .getByLabel("Fim · São Paulo")
        .fill("2026-10-20T11:00");
      await calendarDraft.getByRole("button", { name: /Minimizar/ }).click();
      await page
        .locator(".sidebar")
        .getByRole("button", { name: "Projetos", exact: true })
        .click();
      await page
        .getByRole("button", {
          name: "Restaurar Criar · Calendário",
          exact: true,
        })
        .click();
      assert.equal(
        await calendarDraft
          .getByRole("textbox", { name: "Título", exact: true })
          .inputValue(),
        "Compromisso preparado localmente",
      );
      await calendarDraft
        .getByRole("button", { name: "Preparar aprovação", exact: true })
        .click();
      const executedBeforeCalendar = (
        await page.evaluate(() => window.__nexCalls)
      ).filter((c) => c.path === "operations/execute").length;
      await calendarDraft
        .getByRole("button", { name: "Revisar proposta", exact: true })
        .click();
      await calendarDraft
        .getByRole("button", { name: "Confirmar operação", exact: true })
        .waitFor();
      const calendarPreview = (await page.evaluate(() => window.__nexCalls))
        .filter((c) => c.path === "operations/preview")
        .at(-1);
      assert.equal(calendarPreview.input.operation.kind, "calendar.create");
      assert.equal(
        calendarPreview.input.operation.payload.starts_at,
        "2026-10-20T10:00:00-03:00",
      );
      assert.equal(
        (await page.evaluate(() => window.__nexCalls)).filter(
          (c) => c.path === "operations/execute",
        ).length,
        executedBeforeCalendar,
      );
      await page
        .getByRole("button", { name: "Preferências de aparência", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Seu ambiente", exact: true })
        .waitFor();
      assert.equal(await page.locator("#root").evaluate((e) => e.inert), true);
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#root").evaluate((e) => e.inert), false);
      await closeWindows();
      await page
        .locator(".sidebar")
        .getByRole("button", { name: "Caixa de entrada", exact: true })
        .click();
      await page
        .getByRole("navigation", { name: "Instrumentos conectados" })
        .getByRole("button", { name: "Google · Tarefas", exact: true })
        .click();
      await page
        .getByRole("region", { name: "Google / Caixa de entrada", exact: true })
        .getByRole("button", { name: "Capturar no NexOS · cópia", exact: true })
        .click();
      const tasksApproval = page.getByRole("dialog", {
        name: "Aprovação · criação",
        exact: true,
      });
      await tasksApproval
        .getByRole("heading", { name: "Reunião", exact: true })
        .waitFor();
      const actionsBeforeCopy = (
        await page.evaluate(() => window.__nexCalls)
      ).filter((c) => c.path === "actions").length;
      await tasksApproval
        .getByRole("button", { name: "Confirmar criação", exact: true })
        .click();
      await page.waitForTimeout(250);
      await tasksApproval
        .getByRole("button", { name: "Abrir registro", exact: true })
        .waitFor({ timeout: 3000 });
      assert.equal(
        (await page.evaluate(() => window.__nexCalls)).filter(
          (c) => c.path === "actions",
        ).length,
        actionsBeforeCopy + 1,
      );
      assert.equal(
        (await page.evaluate(() => window.__nexCalls)).filter(
          (c) => c.path === "chat",
        ).length,
        chatsBeforeBridges,
        "bridges and approval must not consume inference",
      );
      await closeWindows();
    }
    if (process.env.NEX_QA_BRIDGES_ONLY) {
      await page.evaluate(() => (window.__nexGoogle = true));
      await page
        .getByRole("button", { name: "Verificar conexões", exact: true })
        .click();
      await page.getByText("Autorizado", { exact: true }).waitFor();
      await verifyBridges();
      console.log("N.E.X module bridges passed");
      return;
    }
    const localMessage = page.getByRole("textbox", { name: "Sua mensagem" });
    const chatsBeforeLocal = (
      await page.evaluate(() => window.__nexCalls)
    ).filter((c) => c.path === "chat").length;
    await localMessage.fill("O que tenho hoje?");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    const agendaWindow = page.getByRole("dialog", { name: /Agenda ·/ });
    await agendaWindow.waitFor();
    assert.equal(
      await page.locator("#root").evaluate((e) => e.inert),
      false,
      "data windows are modeless",
    );
    const grip = agendaWindow.getByRole("button", { name: /Mover janela/ });
    const original = await agendaWindow.boundingBox();
    await grip.press("ArrowRight");
    await page.waitForFunction(
      (x) =>
        document.querySelector(".nex-floating-window").getBoundingClientRect()
          .x > x,
      original.x,
    );
    await agendaWindow.getByRole("button", { name: /Minimizar/ }).click();
    await agendaWindow.waitFor({ state: "hidden" });
    await page.getByRole("button", { name: /Restaurar Agenda/ }).click();
    await agendaWindow.waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "chat",
      ).length,
      chatsBeforeLocal,
    );
    await localMessage.fill("Criar projeto: Órbita local");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    const localApproval = page.getByRole("dialog", {
      name: "Aprovação · Criar projeto",
      exact: true,
    });
    await localApproval
      .getByRole("button", { name: "Revisar proposta", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "operations/execute",
      ).length,
      0,
    );
    await page.screenshot({
      path: root + "/../a07-baseline-windows-dark-1440.jpg",
      type: "jpeg",
      quality: 85,
    });
    await localApproval
      .getByRole("button", { name: "Revisar proposta", exact: true })
      .click();
    await localApproval
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .waitFor();
    await localApproval.getByRole("button", { name: /Minimizar/ }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Hoje", exact: true })
      .click();
    await page.waitForURL("**/hoje");
    await page
      .getByRole("button", {
        name: "Restaurar Aprovação · Criar projeto",
        exact: true,
      })
      .click();
    await localApproval
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "operations/preview",
      ).length,
      1,
      "preview preserved through route/minimize",
    );
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "chat",
      ).length,
      chatsBeforeLocal,
      "local proposals do not call the model",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "light"),
    );
    const small = await localApproval.boundingBox();
    await page.waitForFunction(() => {
      const r = Array.from(document.querySelectorAll(".nex-floating-window"))
        .at(-1)
        .getBoundingClientRect();
      return r.x >= 0 && r.x + r.width <= 391 && r.y + r.height <= 845;
    });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: root + "/../a07-baseline-window-light-390.jpg",
      type: "jpeg",
      quality: 85,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    await closeWindows();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "N.E.X", exact: true })
      .click();
    await page.waitForURL("**/nex");
    await localMessage.fill("Uma pergunta livre desconhecida");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Comandos sem IA", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "chat",
      ).length,
      chatsBeforeLocal,
    );
    await closeWindows();
    // A07: workspace management, keyboard resize, local search and interruptible motion.
    const localSend = async (text) => {
      await localMessage.fill(text);
      await localMessage.press("Control+Enter");
    };
    await localSend("Buscar: termo-inexistente-a07");
    const searchWindow = page.getByRole("dialog", {
      name: "Busca · termo-inexistente-a07",
      exact: true,
    });
    await searchWindow
      .getByText("Nenhum registro encontrado nos dados carregados.")
      .waitFor();
    await localSend("Missões atrasadas");
    const overdueWindow = page.getByRole("dialog", {
      name: "Missões atrasadas",
      exact: true,
    });
    await overdueWindow.waitFor();
    assert.equal(
      await page.locator(".nex-floating-window").count(),
      1,
      "search reuses one window with refreshed title",
    );
    await localSend("O que tenho hoje?");
    await page
      .getByRole("button", { name: "Organizar janelas", exact: true })
      .click();
    const tiled = await page
      .locator(".nex-floating-window:visible")
      .evaluateAll((nodes) =>
        nodes.map((n) => {
          const r = n.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        }),
      );
    assert.equal(tiled.length, 2);
    assert.ok(
      tiled[0].x + tiled[0].width <= tiled[1].x ||
        tiled[1].x + tiled[1].width <= tiled[0].x,
    );
    const disposition = overdueWindow.getByRole("combobox", {
      name: "Disposição de Missões atrasadas",
    });
    await disposition.selectOption("left");
    assert.equal(await overdueWindow.getAttribute("data-layout"), "left");
    await disposition.selectOption("free");
    await page.waitForFunction(() => {
      const n = document.querySelector(
        '[aria-label="Missões atrasadas"].nex-floating-window',
      );
      return (
        n.dataset.layout === "free" &&
        Math.abs(
          n.getBoundingClientRect().width -
            parseFloat(getComputedStyle(n).getPropertyValue("--window-width")),
        ) < 1
      );
    });
    const beforeSize = await overdueWindow.boundingBox();
    await overdueWindow
      .getByRole("button", {
        name: "Redimensionar Missões atrasadas",
        exact: true,
      })
      .press("ArrowLeft");
    await page.waitForFunction(
      (width) =>
        document
          .querySelector('[aria-label="Missões atrasadas"].nex-floating-window')
          .getBoundingClientRect().width < width,
      beforeSize.width,
    );
    const resizeGrip = await overdueWindow
      .getByRole("button", {
        name: "Redimensionar Missões atrasadas",
        exact: true,
      })
      .boundingBox();
    const beforePointerSize = await overdueWindow.boundingBox();
    await page.mouse.move(
      resizeGrip.x + resizeGrip.width / 2,
      resizeGrip.y + resizeGrip.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      resizeGrip.x + resizeGrip.width / 2 - 32,
      resizeGrip.y + resizeGrip.height / 2 - 32,
      { steps: 3 },
    );
    await page.mouse.up();
    await page.waitForFunction(
      (width) =>
        document
          .querySelector('[aria-label="Missões atrasadas"].nex-floating-window')
          .getBoundingClientRect().width < width,
      beforePointerSize.width,
    );
    const dockOrderBefore = await page
      .locator(".nex-window-dock button[data-minimized]")
      .allTextContents();
    const activeBefore = await page
      .locator('.nex-floating-window[data-active="true"]')
      .getAttribute("aria-label");
    await page.keyboard.press("Alt+PageDown");
    assert.notEqual(
      await page
        .locator('.nex-floating-window[data-active="true"]')
        .getAttribute("aria-label"),
      activeBefore,
    );
    assert.deepEqual(
      await page
        .locator(".nex-window-dock button[data-minimized]")
        .allTextContents(),
      dockOrderBefore,
      "dock order does not jump when focusing a window",
    );
    await page
      .getByRole("button", { name: "Recolher janelas", exact: true })
      .click();
    assert.equal(await page.locator(".nex-floating-window:visible").count(), 0);
    await page
      .getByRole("button", { name: "Seletor de janelas", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Filtrar janelas" })
      .fill("atrasadas");
    await page
      .getByRole("button", {
        name: "Alternar para Missões atrasadas",
        exact: true,
      })
      .click();
    await overdueWindow.waitFor();
    await overdueWindow
      .getByRole("button", {
        name: "Mover janela Missões atrasadas",
        exact: true,
      })
      .press("Alt+m");
    await overdueWindow.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Restaurar janelas", exact: true })
      .click();
    assert.equal(await page.locator(".nex-floating-window:visible").count(), 2);
    // Enable actual motion: transitions can be interrupted and reduce-motion settles immediately.
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await disposition.selectOption("right");
    await disposition.selectOption("maximized");
    await overdueWindow.evaluate(async (n) => {
      await Promise.all(
        n.getAnimations().map((a) => a.finished.catch(() => {})),
      );
    });
    await page.waitForTimeout(30);
    assert.equal(
      await overdueWindow.evaluate((n) => getComputedStyle(n).transform),
      "none",
    );
    assert.ok((await overdueWindow.boundingBox()).width > 1400);
    await overdueWindow.getByRole("button", { name: /Minimizar/ }).click();
    await page
      .getByRole("button", { name: "Restaurar Missões atrasadas", exact: true })
      .click();
    await page.waitForTimeout(260);
    assert.equal(
      await overdueWindow.isVisible(),
      true,
      "interrupted minimize restores latest state",
    );
    assert.equal(await overdueWindow.evaluate((n) => n.inert), false);
    await disposition.selectOption("left");
    await page.evaluate(() => {
      window.__motionChanged = false;
      matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
        "change",
        () => {
          window.__motionChanged = true;
        },
        { once: true },
      );
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => window.__motionChanged);
    assert.equal(
      await overdueWindow.evaluate((n) => getComputedStyle(n).transform),
      "none",
    );
    await page
      .getByRole("button", { name: "Organizar janelas", exact: true })
      .click();
    await localSend("Buscar: neurofisiologia");
    await page
      .getByRole("dialog", { name: "Busca · neurofisiologia", exact: true })
      .getByText("Revisar neurofisiologia por 45 min", { exact: true })
      .waitFor();
    await page
      .getByRole("dialog", { name: /Agenda ·/ })
      .getByRole("button", { name: /^Fechar / })
      .click();
    await page
      .getByRole("dialog", { name: /Agenda ·/ })
      .waitFor({ state: "hidden" });
    await localSend("Mostre projetos");
    await page.getByRole("dialog", { name: "Projetos", exact: true }).waitFor();
    await localSend("Recolher janelas");
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".nex-floating-window:not([hidden])")
          .length === 0,
    );
    await localSend("Restaurar janelas");
    await page
      .getByRole("button", { name: "Organizar janelas", exact: true })
      .click();
    await page.screenshot({
      path: root + "/docs/design/previews/a07-workspace-dark-1440.jpg",
      type: "jpeg",
      quality: 85,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "light"),
    );
    await page
      .getByRole("button", { name: "Seletor de janelas", exact: true })
      .click();
    await page.getByRole("searchbox", { name: "Filtrar janelas" }).fill("");
    await page.waitForTimeout(250);
    assert.equal(
      await page
        .getByRole("button", { name: "Organizar janelas", exact: true })
        .isVisible(),
      false,
    );
    assert.ok(
      await page
        .locator(".nex-window-switcher")
        .evaluate((n) => n.getBoundingClientRect().right <= window.innerWidth),
    );
    await page.screenshot({
      path: root + "/docs/design/previews/a07-switcher-light-390.jpg",
      type: "jpeg",
      quality: 85,
    });
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(
      () => (document.documentElement.dataset.theme = "dark"),
    );
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "chat",
      ).length,
      chatsBeforeLocal,
      "A07 search and window management never call inference",
    );
    await closeWindows();
    if (process.env.NEX_QA_DESKTOP_ONLY) {
      assert.deepEqual(errors, []);
      console.log("A07 desktop/search/motion passed");
      return;
    }
    await page
      .getByRole("checkbox", { name: "Usar IA em perguntas livres" })
      .check();
    await page.evaluate(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      });
    });
    await page.getByRole("button", { name: "Ditar mensagem" }).click();
    await page
      .getByRole("alert")
      .getByText("Permissão de microfone negada.", { exact: false })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "transcribe",
      ).length,
      0,
    );
    // Exercise real MediaRecorder/WAV/VAD with generated audio; no physical mic or external API.
    await page.evaluate(() => {
      window.__voiceStreams = [];
      window.__spoken = [];
      Object.defineProperty(window, "SpeechSynthesisUtterance", {
        configurable: true,
        value: class {
          constructor(text) {
            this.text = text;
          }
        },
      });
      let speechTimer;
      Object.defineProperty(window, "speechSynthesis", {
        configurable: true,
        value: {
          getVoices: () => [
            { localService: true, lang: "pt-BR", name: "QA local" },
          ],
          cancel: () => clearTimeout(speechTimer),
          speak: (utterance) => {
            if (
              window.__voiceStreams.some((stream) =>
                stream.getTracks().some((t) => t.readyState !== "ended"),
              )
            )
              throw Error("Microphone must be stopped before speech");
            window.__spoken.push(utterance.text);
            utterance.onstart?.();
            speechTimer = setTimeout(() => utterance.onend?.(), 100);
          },
        },
      });
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          const audio = new AudioContext(),
            osc = audio.createOscillator(),
            gain = audio.createGain(),
            out = audio.createMediaStreamDestination();
          osc.frequency.value = 180;
          gain.gain.value = 0.2;
          osc.connect(gain);
          gain.connect(out);
          osc.start();
          await audio.resume();
          setTimeout(() => (gain.gain.value = 0), 450);
          for (const track of out.stream.getTracks()) {
            const stop = track.stop.bind(track);
            track.stop = () => {
              if (track.readyState === "ended") return;
              stop();
              osc.stop();
              void audio.close();
            };
          }
          window.__voiceStreams.push(out.stream);
          return out.stream;
        },
      });
    });
    await page
      .getByRole("button", { name: "Conversar por voz", exact: true })
      .click();
    await page.waitForFunction(() => window.__spoken.length >= 2, {
      timeout: 15000,
    });
    await page
      .getByRole("button", { name: "Pausar conversa", exact: true })
      .click();
    const voiceCalls = (await page.evaluate(() => window.__nexCalls)).filter(
      (c) => c.path === "transcribe",
    ).length;
    await page.waitForTimeout(500);
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "transcribe",
      ).length,
      voiceCalls,
      "no requests after manual pause",
    );
    assert.ok(
      await page.evaluate(() =>
        window.__voiceStreams.every((stream) =>
          stream.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
      "all microphone tracks must close",
    );
    // A spoken stop command ends capture locally, without an inference call.
    await page.evaluate(() => (window.__voiceTranscript = "Parar conversa"));
    const chatsBeforeStop = (
      await page.evaluate(() => window.__nexCalls)
    ).filter((c) => c.path === "chat").length;
    await page
      .getByRole("button", { name: "Conversar por voz", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pausar conversa", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Conversar por voz", exact: true })
      .waitFor({ timeout: 15000 });
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "chat",
      ).length,
      chatsBeforeStop,
    );
    await page.evaluate(() => {
      window.__voiceTranscript = "Pergunta de voz";
      window.__nexFail = true;
    });
    await page
      .getByRole("button", { name: "Conversar por voz", exact: true })
      .click();
    await page
      .getByRole("alert")
      .getByText("Cota preventiva atingida. Aguarde.")
      .waitFor({ timeout: 15000 });
    await page
      .getByRole("button", { name: "Conversar por voz", exact: true })
      .waitFor();
    const failedCalls = (await page.evaluate(() => window.__nexCalls)).length;
    await page.waitForTimeout(600);
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).length,
      failedCalls,
      "quota errors stop the loop",
    );
    assert.ok(
      await page.evaluate(() =>
        window.__voiceStreams.every((stream) =>
          stream.getTracks().every((t) => t.readyState === "ended"),
        ),
      ),
    );
    await page.evaluate(() => (window.__nexFail = false));
    await page.getByRole("textbox", { name: "Sua mensagem" }).fill("");
    const message = page.getByRole("textbox", { name: "Sua mensagem" });
    await message.fill("Crie uma missão para revisar matemática");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page.getByRole("dialog", { name: "Aprovação · criação" }).waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "actions",
      ).length,
      0,
    );
    await page.getByRole("button", { name: "Confirmar criação" }).click();
    await page.getByRole("button", { name: "Abrir registro" }).waitFor();
    await closeWindows();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "actions",
      ).length,
      1,
    );
    await page.getByRole("button", { name: "Ver dados disponíveis" }).click();
    const dialog = page.getByRole("dialog", { name: "Contexto · Geral" });
    await dialog.waitFor();
    assert.match(await dialog.textContent(), /Revisar Física/);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.locator("#root").evaluate((e) => e.inert), false);
    await page
      .getByRole("button", { name: "Conexões e ajustes", exact: true })
      .click();
    await page
      .getByText("Conexões, memória e instrumentos externos", { exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Nova memória" })
      .fill("Prefiro começar pelo essencial");
    await page.getByRole("button", { name: "Salvar memória" }).click();
    await page
      .locator(".nex-memory-list")
      .getByText("Prefiro começar pelo essencial", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await page
      .locator(".nex-memory-list")
      .getByText("Prefiro começar pelo essencial", { exact: true })
      .waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Fechar ajustes N.E.X" }).click();
    await page.evaluate(() => (window.__nexAdvanced = true));
    await message.fill("Crie um projeto orbital");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Restaurar Aprovação · Criar projeto",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Revisar proposta", exact: true })
      .last()
      .click();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "operations/execute",
      ).length,
      0,
    );
    await page
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", { name: "Abrir destino", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "operations/execute",
      ).length,
      1,
    );
    await page.getByRole("dialog", { name: "Hoje", exact: true }).waitFor();
    await closeWindows();
    // Google panels never authorize or read implicitly when the account is disconnected.
    await page.evaluate(() => {
      window.__nexGooglePanel = true;
      window.__nexAdvanced = false;
    });
    await message.fill("Mostre meus arquivos Google");
    const readsBefore = (await page.evaluate(() => window.__nexCalls)).filter(
      (c) => c.path === "google/read",
    ).length;
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page
      .getByRole("region", { name: "Google / Biblioteca" })
      .getByRole("button", { name: "Conectar Google", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "google/read",
      ).length,
      readsBefore,
    );
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "google/start",
      ).length,
      0,
    );
    await page.evaluate(() => (window.__nexGoogle = true));
    await page
      .getByRole("button", { name: "Verificar conexões", exact: true })
      .click();
    await page
      .getByRole("region", { name: "Google / Biblioteca" })
      .getByText("Documento autorizado", { exact: true })
      .waitFor();

    await page
      .getByRole("dialog", { name: "Google · Biblioteca" })
      .getByRole("button", { name: "Ler no N.E.X" })
      .click();
    await page
      .getByRole("dialog", { name: "Google · docs" })
      .getByText("Texto retornado pelo leitor simulado.", { exact: true })
      .waitFor();
    assert.ok(
      (await page.evaluate(() => window.__nexCalls)).some(
        (c) =>
          c.path === "google/read" &&
          c.input.service === "docs" &&
          c.input.id === "file-authorized",
      ),
    );
    await closeWindows();
    await page.evaluate(() => {
      window.__nexGooglePanel = false;
      window.__nexAdvanced = true;
    });
    await page
      .getByRole("button", { name: "Conexões e ajustes", exact: true })
      .click();
    await page
      .getByText("Conexões, memória e instrumentos externos", { exact: true })
      .click();
    await page
      .getByRole("checkbox", {
        name: "Compartilhar esta consulta Google na próxima mensagem com IA",
      })
      .check();
    await page.getByRole("button", { name: "Fechar ajustes N.E.X" }).click();
    await message.fill("Resuma o documento selecionado");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page
      .getByRole("button", { name: "Verificar conexões", exact: true })
      .waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        window.__nexCalls.filter((c) => c.path === "chat").at(-1)?.input
          .googleContext?.service === "calendar",
    );
    await page
      .getByRole("button", { name: "Conexões e ajustes", exact: true })
      .click();
    await page
      .getByText("Conexões, memória e instrumentos externos", { exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("checkbox", {
          name: "Compartilhar esta consulta Google na próxima mensagem com IA",
        })
        .isChecked(),
      false,
      "Google context applies to one message only",
    );
    await page.getByRole("button", { name: "Fechar ajustes N.E.X" }).click();

    await page.evaluate(() => (window.__nexFail = true));
    await message.fill("Texto que precisa permanecer");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page
      .getByRole("alert")
      .getByText("Cota preventiva atingida. Aguarde.")
      .waitFor();
    assert.equal(await message.inputValue(), "Texto que precisa permanecer");
    const beforeNavigation = (
      await page.evaluate(() => window.__nexCalls)
    ).filter((c) => c.path === "chat").length;
    await message.fill("Abra Hoje");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page.waitForURL("**/hoje");
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "chat",
      ).length,
      beforeNavigation,
      "exact area navigation needs no inference",
    );
    await page
      .getByRole("button", { name: "Abrir N.E.X", exact: true })
      .click();
    const panel = page.getByRole("dialog", {
      name: "N.E.X Intelligence",
      exact: true,
    });
    await panel.waitFor();
    assert.match(await panel.textContent(), /N.E.X/);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await panel.evaluate((e) => e.contains(document.activeElement)),
      );
    }
    await panel
      .getByRole("button", { name: "Conexões e ajustes", exact: true })
      .click();
    await panel
      .getByText("Contexto e permissões · Geral", { exact: true })
      .click();
    await panel.getByRole("button", { name: "Inspecionar contexto" }).click();
    await panel.waitFor({ state: "hidden" });
    await page
      .getByRole("dialog", { name: "Contexto · Geral" })
      .getByText("Revisar Física", { exact: true })
      .waitFor();
    await closeWindows();
    assert.equal(await page.locator("#root").evaluate((e) => e.inert), false);
    await verifyBridges();
    for (const path of [
      "/",
      "/hoje",
      "/missoes",
      "/projetos",
      "/foco",
      "/calendario",
      "/inbox",
      "/estudos",
      "/rotinas",
      "/life-rpg",
      "/metas",
      "/insights",
      "/revisao",
      "/saude",
      "/financas",
      "/conhecimento",
      "/tutorial",
      "/planejamento",
      "/historico",
      "/biblioteca",
    ]) {
      await page.goto("http://127.0.0.1:5182" + path);
      await page.locator(".page-content").waitFor();
      await page.waitForTimeout(80);
      for (const width of [320, 390, 834, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        const o = await page.evaluate(
          () => document.documentElement.scrollWidth,
        );
        assert.ok(o <= width + 1, path + " " + width + " " + o);
      }
    }
    for (const [path, name, width] of [
      ["/", "home", 1440],
      ["/calendario", "calendar", 1440],
      ["/foco", "focus", 1440],
      ["/hoje", "today", 390],
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("http://127.0.0.1:5182" + path);
      await page.locator(".page-content").waitFor();
      await page.evaluate(
        () => (document.documentElement.dataset.theme = "dark"),
      );
      await page.waitForTimeout(150);
      await page.screenshot({
        path: root + `/../a06-${name}-${width}.jpg`,
        fullPage: true,
        type: "jpeg",
        quality: 80,
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      "N.E.X UI: 8 layouts + 80 routes, A07 tiling/switcher/keyboard/pointer resize and interruptible motion, local search/overdue, modeless desktop/local commands, persistent previews/forms, Google Tasks copy with confirmation and zero inference, compact shell, real generated-audio capture/VAD/WAV with mocked Whisper/chat/device voice, pause/quota/stop, Google panels/file reader mocks, proposals, drafts, memory and keyboard passed.",
    );
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
