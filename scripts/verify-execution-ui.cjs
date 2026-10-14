const { chromium } = require(process.env.NEX_PLAYWRIGHT_MODULE || "playwright");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const root = process.cwd(),
  origin = "http://127.0.0.1:5183";
const server = spawn(
  "node",
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    "5183",
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
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    console.log("A08: server readiness checked; launching browser");
    browser = await chromium.launch({
      executablePath: process.env.NEX_CHROMIUM_PATH,
      headless: true,
      args: ["--no-sandbox", "--no-zygote"],
    });
    console.log("A08: browser launched");
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(15000);
    console.log("A08: page created");
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("https://**", (r) => r.abort());
    await page.route("**/src/context/NexusContext.tsx", async (route) => {
      const response = await route.fetch();
      let s = await response.text();
      const replacements = [
        [
          /missions: mockMissions\.map/,
          'missions: [...mockMissions, {...mockMissions[1], id:"inbox-two",title:"Segunda entrada"}].map',
        ],
        [
          /id: mission\.id,/,
          'id: mission.id === "mission-1" ? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" : mission.id,',
        ],
        [
          /project_id: null,/,
          'project_id: mission.id === "mission-1" || mission.id === "mission-3" ? "project-1" : null,',
        ],
        [/notes: null,/, 'notes: "Óptica e revisão",'],
        [
          /status: mission\.done \? "Feita" : "A fazer",/,
          'status: mission.done ? "Feita" : mission.id === "mission-1" ? "A fazer" : "Inbox",',
        ],
        [
          /next_action: project\.nextAction,/,
          'next_action: project.id === "project-2" ? null : project.nextAction,',
        ],
        [
          /processMission: async \(id, patch\) => \{/,
          'processMission: async (id, patch) => { if(window.__failProcess) throw new Error("Falha simulada ao salvar; escolhas preservadas.");',
        ],
      ];
      for (const [from, to] of replacements) {
        assert.match(
          s,
          from,
          "QA fixture owner changed; update the test adapter",
        );
        s = s.replace(from, to);
      }
      await route.fulfill({ response, body: s });
    });
    await page.route("**/src/lib/nex-api.ts", async (route) => {
      const response = await route.fetch();
      let s = await response.text();
      const start = /(async function nexRequest\([^]*?\) \{)/;
      assert.match(s, start);
      s = s.replace(
        start,
        "$1\n if(window.__executionMock) return window.__executionMock(path,input,method,signal);",
      );
      await route.fulfill({ response, body: s });
    });
    await page.addInitScript(() => {
      window.__executionCalls = [];
      window.__executionMock = async (path, input) => {
        window.__executionCalls.push({ path, input });
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
            before: { status: "A fazer" },
            label: "Editar missão",
            warning: "Confira o estado.",
          };
        if (path === "operations/execute")
          return {
            applied: true,
            id: input.operation.payload.id,
            kind: "mission.edit",
            area: "missoes",
          };
        if (path === "chat")
          throw Error("Unexpected inference in local workflow");
        return {};
      };
    });
    await page.clock.setFixedTime(new Date("2026-10-14T12:00:00Z"));
    console.log("A08: loading planning");
    await page.goto(origin + "/planejamento");
    console.log("A08: planning loaded");
    await page
      .getByRole("heading", { name: "O que cabe agora?", exact: true })
      .waitFor();
    await page
      .getByRole("combobox", { name: "Tempo disponível", exact: true })
      .selectOption("25");
    await page
      .getByText("Nenhuma missão inteira cabe nessa janela.", { exact: true })
      .waitFor();
    await page
      .getByRole("combobox", { name: "Tempo disponível", exact: true })
      .selectOption("90");
    const step = page.locator(".execution-steps li").first();
    await step
      .getByText("Revisar neurofisiologia por 45 min", { exact: true })
      .waitFor();
    await step.getByRole("button", { name: /Preparar foco para/ }).click();
    await page.waitForURL("**/foco?**");
    assert.match(page.url(), /mission=aaaaaaaa/);
    assert.match(page.url(), /minutes=45/);
    assert.equal(
      (await page.evaluate(() => window.__executionCalls)).filter(
        (c) => c.path === "operations/execute",
      ).length,
      0,
      "preparing focus does not execute a mutation",
    );
    console.log("A08: planning → focus passed; testing projects");
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Projetos", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Tessitura do Vazio/ })
      .first()
      .click();
    const inspector = page.getByRole("complementary", {
      name: "Detalhes do projeto",
    });
    await inspector
      .getByRole("checkbox", {
        name: "Incluir concluídas e canceladas",
        exact: true,
      })
      .check();
    assert.equal(
      await inspector.locator(".project-linked-missions article").count(),
      2,
    );
    await inspector
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("Concluído");
    await inspector
      .getByRole("button", { name: "Salvar projeto", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Estado dos projetos", exact: true })
      .selectOption("Concluído");
    await page
      .locator(".project-portfolio-grid")
      .getByRole("button", { name: /Tessitura do Vazio/ })
      .waitFor();
    await inspector
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("Ativo");
    await inspector
      .getByRole("button", { name: "Salvar projeto", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Estado dos projetos", exact: true })
      .selectOption("Ativo");
    await page
      .locator(".project-portfolio-grid")
      .getByRole("button", { name: /Tessitura do Vazio/ })
      .waitFor();
    await inspector
      .getByRole("button", { name: "Ver missões filtradas", exact: false })
      .click();
    await page.waitForURL("**/missoes?project=project-1");
    assert.equal(
      await page
        .getByRole("combobox", { name: "Projeto das missões" })
        .inputValue(),
      "project-1",
    );
    await page
      .getByRole("combobox", { name: "Estado das missões" })
      .selectOption("A fazer");
    await page
      .getByRole("textbox", { name: "Buscar missão", exact: true })
      .fill("optica");
    await page.waitForFunction(
      () => document.querySelectorAll(".mission-list-row").length === 1,
    );
    await page.locator(".mission-list-row").first().click();
    const missionInspector = page.getByRole("complementary", {
      name: "Detalhes da missão",
    });
    await missionInspector
      .getByRole("spinbutton", {
        name: "Duração estimada · minutos",
        exact: true,
      })
      .fill("20");
    await missionInspector
      .getByRole("button", { name: "Salvar missão", exact: true })
      .click();
    await missionInspector
      .getByText("Alterações salvas.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Planejar bloco", exact: true })
      .click();
    const shortPlan = page.getByRole("dialog", {
      name: "Planejar próximo bloco",
      exact: true,
    });
    await shortPlan
      .getByRole("combobox", { name: "Tempo disponível", exact: true })
      .selectOption("25");
    await shortPlan
      .getByRole("button", {
        name: /Preparar foco para Revisar neurofisiologia/,
      })
      .click();
    await page.waitForURL("**/foco?**");
    assert.match(page.url(), /minutes=20/);
    await shortPlan.getByRole("button", { name: /^Fechar / }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".focus-clock span")?.textContent === "20:00",
    );
    await page.getByRole("button", { name: "Começar", exact: true }).click();
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Hoje", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Voltar ao foco pausado: 20:00/ })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(".focus-clock span")?.textContent === "20:00",
    );
    await page.getByRole("button", { name: "Reiniciar", exact: true }).click();
    await page.getByRole("button", { name: "Começar", exact: true }).waitFor();
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Caixa de entrada", exact: true })
      .click();
    await page.locator(".inbox-item").first().click();
    const inbox = page.getByRole("complementary", {
      name: "Processar entrada",
    });
    const firstTitle = await inbox.locator("h2").innerText();
    await inbox
      .getByRole("checkbox", {
        name: "Selecionar a próxima entrada após salvar",
        exact: true,
      })
      .check();
    await inbox
      .getByRole("combobox", { name: "Projeto", exact: true })
      .selectOption("project-1");
    await page.evaluate(() => (window.__failProcess = true));
    await inbox
      .getByRole("button", { name: "Virar missão", exact: false })
      .click();
    await inbox.getByRole("alert").waitFor();
    assert.equal(await inbox.locator("h2").innerText(), firstTitle);
    assert.equal(
      await inbox
        .getByRole("combobox", { name: "Projeto", exact: true })
        .inputValue(),
      "project-1",
    );
    await page.evaluate(() => (window.__failProcess = false));
    await inbox
      .getByRole("button", { name: "Virar missão", exact: false })
      .click();
    await page.waitForFunction(
      (first) =>
        document.querySelector(".inbox-inspector h2")?.textContent !== first,
      firstTitle,
    );
    assert.equal(
      await inbox
        .getByRole("combobox", { name: "Projeto", exact: true })
        .inputValue(),
      "",
      "next entry does not inherit previous project selection",
    );
    // The local assistant prepares a real operation contract, but only the explicit confirmation executes the mocked endpoint.
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "N.E.X", exact: true })
      .click();
    const send = async (text) => {
      const input = page.getByRole("textbox", {
        name: "Sua mensagem",
        exact: true,
      });
      await input.fill(text);
      await input.press("Control+Enter");
    };
    const close = async () => {
      if (
        await page
          .getByRole("button", { name: "Restaurar janelas", exact: true })
          .count()
      )
        await page
          .getByRole("button", { name: "Restaurar janelas", exact: true })
          .click();
      while (await page.locator(".nex-floating-window:visible").count())
        await page
          .locator(".nex-floating-window:visible")
          .last()
          .getByRole("button", { name: /^Fechar / })
          .click();
    };
    await send("Tenho 25 minutos");
    const planWindow = page.getByRole("dialog", {
      name: "Planejar próximo bloco",
      exact: true,
    });
    await planWindow.waitFor();
    assert.equal(
      await planWindow
        .getByRole("combobox", { name: "Tempo disponível", exact: true })
        .inputValue(),
      "25",
    );
    await send("Tenho 90 minutos");
    await page.waitForFunction(
      () =>
        document.querySelector(
          ".nex-floating-window .execution-controls select",
        )?.value === "90",
    );
    assert.equal(await page.locator(".nex-floating-window").count(), 1);
    await close();
    await send("Resumo do projeto: Tessitura do Vazio");
    await page
      .getByRole("dialog", {
        name: "Projeto · Tessitura do Vazio",
        exact: true,
      })
      .getByText("Revisar neurofisiologia por 45 min", { exact: true })
      .waitFor();
    await close();
    await send("Iniciar missão: Revisar neurofisiologia por 45 min");
    const approval = page.getByRole("dialog", {
      name: "Aprovação · Editar missão",
      exact: true,
    });
    await approval
      .getByRole("button", { name: "Revisar proposta", exact: true })
      .click();
    await approval
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .waitFor();
    assert.equal(
      (await page.evaluate(() => window.__executionCalls)).filter(
        (c) => c.path === "operations/execute",
      ).length,
      0,
    );
    await approval
      .getByRole("button", { name: "Confirmar operação", exact: true })
      .click();
    await approval
      .getByText("Operação confirmada no destino.", { exact: true })
      .waitFor();
    const executed = (
      await page.evaluate(() => window.__executionCalls)
    ).filter((c) => c.path === "operations/execute");
    assert.equal(executed.length, 1);
    assert.equal(executed[0].input.confirmed, true);
    assert.equal(executed[0].input.operation.payload.status, "Em andamento");
    await close();
    for (const command of [
      "Missões bloqueadas",
      "Projetos sem próxima ação",
      "Rotinas de hoje",
      "Estudos de hoje",
      "Resumo do foco",
    ]) {
      await send(command);
      await page.getByRole("dialog", { name: command, exact: true }).waitFor();
      await close();
    }
    assert.equal(
      (await page.evaluate(() => window.__executionCalls)).filter(
        (c) => c.path === "chat",
      ).length,
      0,
      "expanded assistant is deterministic, including proposals",
    );
    // Render the connected pages at four widths, both themes, without changing production data.
    for (const width of [320, 390, 834, 1440])
      for (const theme of ["dark", "light"]) {
        await page.setViewportSize({ width, height: width < 720 ? 844 : 1000 });
        for (const route of [
          "planejamento",
          "hoje",
          "missoes",
          "projetos",
          "inbox",
        ]) {
          await page.goto(origin + "/" + route);
          await page.locator(".page-stack").waitFor();
          await page.evaluate(
            (theme) => (document.documentElement.dataset.theme = theme),
            theme,
          );
          await page.waitForTimeout(150);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${route}/${width}/${theme} overflow`,
          );
          if (route === "planejamento" && width === 1440 && theme === "dark")
            await page.screenshot({
              path: root + "/docs/design/previews/a08-planning-dark-1440.jpg",
              type: "jpeg",
              quality: 85,
            });
          if (route === "planejamento" && width === 390 && theme === "light")
            await page.screenshot({
              path: root + "/docs/design/previews/a08-planning-light-390.jpg",
              type: "jpeg",
              quality: 85,
            });
        }
      }
    assert.deepEqual(errors, []);
    console.log(
      "A08 execution UI: 40 page/width/theme compositions; planning to focus, project completion/restore/history, mission filters, Inbox next/error retention, local planner/dossier/views and one confirmed mission operation with zero chat passed.",
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }
})();
