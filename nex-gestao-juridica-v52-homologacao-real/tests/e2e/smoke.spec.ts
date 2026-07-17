import { expect, test, type Page } from "@playwright/test";

async function openApplication(page: Page) {
  if (process.env.PLAYWRIGHT_NO_NAVIGATION !== "1") {
    await page.goto("/");
    return;
  }

  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.evaluate(() => {
    const createStorage = () => {
      const store = new Map<string, string>();
      return {
        get length() { return store.size; },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => store.set(key, String(value)),
      };
    };
    Object.defineProperty(window, "localStorage", { configurable: true, value: createStorage() });
    Object.defineProperty(window, "sessionStorage", { configurable: true, value: createStorage() });
    history.pushState = () => undefined;
    history.replaceState = () => undefined;
  });
  const response = await fetch("http://127.0.0.1:3000/");
  const html = (await response.text()).replace("<head>", '<head><base href="http://127.0.0.1:3000/">');
  await page.setContent(html, { waitUntil: "domcontentloaded" });
}

async function loginDemo(page: Page) {
  await openApplication(page);
  await page.getByRole("button", { name: "Acesso interno restrito" }).click();
  await page.getByLabel("E-mail").fill("admin@nex.local");
  await page.getByLabel("Senha").fill("demo-seguro");
  await page.getByRole("button", { name: "Entrar no painel" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.locator(".module-loading")).toHaveCount(0, { timeout: 20_000 });
}

async function assertNoGlobalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

async function openModule(page: Page, label: string) {
  const direct = page.locator(`button[title="${label}"]:visible`).first();
  if (await direct.count()) {
    await direct.click();
  } else {
    const bottomItem = page.locator(".mobile-bottom-nav button:visible").filter({ hasText: label }).first();
    if (await bottomItem.count()) {
      await bottomItem.click();
    } else {
      const menu = page.locator(".mobile-bottom-nav button:visible").filter({ hasText: "Menu" }).first();
      await expect(menu).toBeVisible();
      await menu.click();
      const item = page.getByRole("dialog", { name: "Menu completo" }).locator("button").filter({ hasText: label }).first();
      await expect(item).toBeVisible();
      await item.click();
    }
  }
  await expect(page.getByRole("heading", { name: label, exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".module-loading")).toHaveCount(0, { timeout: 20_000 });
  await assertNoGlobalOverflow(page);
}

const responsiveViewports = [
  { name: "mobile-320", width: 320, height: 700 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "tablet-768", width: 768, height: 1024 },
] as const;

test("desktop abre dashboard e módulos críticos sem overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await loginDemo(page);
  await assertNoGlobalOverflow(page);
  await page.screenshot({ path: "artifacts/previews/dashboard-desktop.png", fullPage: false });

  for (const label of ["CRM", "Processos", "Tarefas", "Financeiro", "Agenda"]) {
    await openModule(page, label);
    if (["Tarefas", "Financeiro", "Agenda"].includes(label)) {
      await page.screenshot({ path: `artifacts/previews/${label.toLowerCase()}-desktop.png`, fullPage: false });
    }
  }
});

test("responsividade crítica funciona de 320 a 768 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await loginDemo(page);

  for (const viewport of responsiveViewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openModule(page, "Dashboard");
    await assertNoGlobalOverflow(page);
    if ([320, 390, 768].includes(viewport.width)) {
      await page.screenshot({ path: `artifacts/previews/dashboard-${viewport.name}.png`, fullPage: false });
    }

    await openModule(page, "CRM");
    await openModule(page, "Processos");
    await openModule(page, "Tarefas");
    if (viewport.width <= 414) {
      await expect(page.locator(".workflow-mobile-list")).toBeVisible();
      await expect(page.locator(".task-kanban")).toBeHidden();
    }
    if ([320, 390, 768].includes(viewport.width)) {
      await page.screenshot({ path: `artifacts/previews/tarefas-${viewport.name}.png`, fullPage: false });
    }

    await openModule(page, "Financeiro");
    if (viewport.width <= 414) {
      await expect(page.locator(".finance-mobile-ledger")).toBeVisible();
      await expect(page.locator(".finance-desktop-ledger")).toBeHidden();
    }
    if ([320, 390, 768].includes(viewport.width)) {
      await page.screenshot({ path: `artifacts/previews/financeiro-${viewport.name}.png`, fullPage: false });
    }

    await openModule(page, "Agenda");
    if ([320, 390, 768].includes(viewport.width)) {
      await page.screenshot({ path: `artifacts/previews/agenda-${viewport.name}.png`, fullPage: false });
    }
  }
});

test("layouts móveis próprios não dependem de tabelas ou Kanban comprimidos", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await loginDemo(page);
  await openModule(page, "Tarefas");
  await expect(page.locator(".workflow-mobile-list")).toBeVisible();
  await expect(page.locator(".task-kanban")).toBeHidden();
  await openModule(page, "Financeiro");
  await expect(page.locator(".finance-mobile-ledger")).toBeVisible();
  await expect(page.locator(".finance-desktop-ledger")).toBeHidden();
  await openModule(page, "Agenda");
  await page.getByRole("button", { name: "Pagamentos", exact: true }).click();
  await expect(page.locator(".agenda-payment-mobile")).toBeVisible();
  await expect(page.locator(".agenda-payment-desktop")).toBeHidden();
  await assertNoGlobalOverflow(page);
});

test("mobile cria e preserva um lead no modo demonstração", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await loginDemo(page);
  await openModule(page, "CRM");

  const leadName = `Lead mobile v5.2 ${Date.now()}`;
  await page.getByRole("button", { name: "Novo lead" }).click();
  const dialog = page.getByRole("dialog").filter({ hasText: "Novo lead" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nome / Razão social").fill(leadName);
  await dialog.getByLabel("Telefone / WhatsApp").fill("(99) 99999-5252");
  await dialog.getByLabel("E-mail").fill("lead-mobile-v52@example.com");
  await dialog.getByLabel("Próxima ação").fill("2026-07-16");
  await dialog.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
  await expect(page.locator(".crm-mobile-pipeline strong:visible").filter({ hasText: leadName }).first()).toBeVisible();
  await assertNoGlobalOverflow(page);

  // No CI comum a aplicação navega normalmente e a persistência demo pode ser
  // confirmada após reload. No sandbox restrito, o HTML é injetado por setContent,
  // portanto validamos a permanência após trocar de módulo e retornar.
  if (process.env.PLAYWRIGHT_NO_NAVIGATION !== "1") {
    await page.reload();
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await openModule(page, "CRM");
  } else {
    await openModule(page, "Dashboard");
    await openModule(page, "CRM");
  }
  await expect(page.locator(".crm-mobile-pipeline strong:visible").filter({ hasText: leadName }).first()).toBeVisible();
});
