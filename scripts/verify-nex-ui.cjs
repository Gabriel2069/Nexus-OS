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
  let browser;
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
    const page = await browser.newPage({
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
            google: null,
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
        if (path === "google/read")
          return {
            service: input.service,
            data: { items: [{ summary: "Reunião", id: "event" }] },
          };
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
            path:
              root + `/docs/design/previews/nex-orbital-${theme}-${width}.jpg`,
            fullPage: true,
            type: "jpeg",
            quality: 80,
          });
      }
    await page.setViewportSize({ width: 390, height: 1000 });
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
    await page.evaluate(() => {
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      });
    });
    await page.getByRole("button", { name: "Gravar até 30 s" }).click();
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
    const message = page.getByRole("textbox", { name: "Sua mensagem" });
    await message.fill("Crie uma missão para revisar matemática");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page
      .getByText("Confira antes de confirmar.", { exact: false })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "actions",
      ).length,
      0,
    );
    await page.getByRole("button", { name: "Confirmar criação" }).click();
    await page.getByRole("button", { name: "Abrir registro" }).waitFor();
    assert.equal(
      (await page.evaluate(() => window.__nexCalls)).filter(
        (c) => c.path === "actions",
      ).length,
      1,
    );
    await page
      .getByText("Contexto e permissões · Geral", { exact: true })
      .click();
    await page.getByRole("button", { name: "Inspecionar contexto" }).click();
    const dialog = page.getByRole("dialog", { name: "Contexto · Geral" });
    await dialog.waitFor();
    assert.match(await dialog.textContent(), /Revisar Física/);
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    assert.equal(await page.locator("#root").evaluate((e) => e.inert), false);
    await page
      .getByText("Conexões, memória e instrumentos externos", { exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Nova memória" })
      .fill("Prefiro começar pelo essencial");
    await page.getByRole("button", { name: "Salvar memória" }).click();
    await page
      .getByText("Prefiro começar pelo essencial", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Excluir", exact: true }).click();
    await page.getByRole("button", { name: "Confirmar exclusão" }).click();
    await page
      .getByText("Prefiro começar pelo essencial", { exact: true })
      .waitFor({ state: "hidden" });
    await page.evaluate(() => (window.__nexAdvanced = true));
    await message.fill("Crie um projeto orbital");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
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
    await page
      .getByRole("button", { name: "Expandir consulta", exact: true })
      .click();
    await page.getByRole("dialog", { name: "Hoje", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.evaluate(() => (window.__nexFail = true));
    await message.fill("Texto que precisa permanecer");
    await page.getByRole("button", { name: "Enviar", exact: true }).click();
    await page
      .getByRole("alert")
      .getByText("Cota preventiva atingida. Aguarde.")
      .waitFor();
    assert.equal(await message.inputValue(), "Texto que precisa permanecer");
    await page
      .getByRole("button", { name: "Hoje", exact: true })
      .last()
      .click();
    await page.waitForURL("**/hoje");
    await page
      .getByRole("button", { name: "Abrir N.E.X", exact: true })
      .click();
    const panel = page.getByRole("dialog", {
      name: "N.E.X Intelligence",
      exact: true,
    });
    await panel.waitFor();
    assert.match(await panel.textContent(), /Posso criar/);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await panel.evaluate((e) => e.contains(document.activeElement)),
      );
    }
    await panel
      .getByText("Contexto e permissões · Geral", { exact: true })
      .click();
    await panel.getByRole("button", { name: "Inspecionar contexto" }).click();
    await panel.getByText("Revisar Física", { exact: true }).waitFor();
    assert.equal(await page.getByRole("dialog").count(), 1);
    await page.keyboard.press("Escape");
    await panel.waitFor({ state: "hidden" });
    assert.equal(await page.locator("#root").evaluate((e) => e.inert), false);
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
    assert.deepEqual(errors, []);
    console.log(
      "N.E.X UI: 8 layouts, chat proposal/confirmation, error draft, memory/delete, inspector, navigation persistence, overlay Tab/Escape/inert passed.",
    );
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
