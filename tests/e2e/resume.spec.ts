import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { SAMPLE_CONTENT } from "../../src/features/templates/sample";
import type { TailorSession } from "../../src/features/tailor/types";

const id = "b8ef324b-5f7d-4724-a0d7-79ba38f25fc1";
const resume = {
  id,
  title: "Fictional resume",
  templateId: "classic",
  content: SAMPLE_CONTENT,
  revision: 1,
  sourceResumeId: null,
  jobId: null,
  createdAt: "2026-11-20T00:00:00Z",
  updatedAt: "2026-11-20T00:00:00Z",
};
test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
  );
  await page.addInitScript((data) => {
    if (!localStorage.getItem("seeded")) {
      localStorage.setItem("rello.dev.resumes", JSON.stringify([data]));
      localStorage.setItem("seeded", "true");
    }
  }, resume);
});

test("edit, save, navigate, and recover an interrupted draft", async ({ page }) => {
  await page.goto(`/r/${id}`);
  const name = page.getByRole("textbox", { name: "Full name", exact: true });
  await name.fill("Fictional Changed Name");
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Back to your resumes", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your resumes" })).toBeVisible();
  await page.goto(`/r/${id}`);
  await expect(name).toHaveValue("Fictional Changed Name");
  await page.evaluate(
    ({ id }) => {
      const saved = JSON.parse(localStorage.getItem("rello.dev.resumes")!)[0];
      sessionStorage.setItem(
        `rello.draft.${id}`,
        JSON.stringify({
          value: {
            content: { ...saved.content, personal: { ...saved.content.personal, name: "Recovered Name" } },
            title: saved.title,
            templateId: saved.templateId,
          },
          version: { revision: saved.revision },
        }),
      );
    },
    { id },
  );
  await page.reload();
  await expect(name).toHaveValue("Recovered Name");
});

test("reduced-motion mobile landing hydrates and exposes navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/?home");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Page sections" }).click();
  await expect(page.getByRole("menuitem", { name: "Pricing" })).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors.filter((error) => /hydration|hydrating/i.test(error))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
  for (const article of await page.locator("article").all()) {
    await article.scrollIntoViewIfNeeded();
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  }
  await page.screenshot({ path: "test-results/mobile-landing.png", fullPage: true, animations: "disabled" });
});

test("a corrupt stored resume exposes recovery and never opens a blank editor", async ({ page }) => {
  await page.goto("/resumes");
  await page.evaluate(() => {
    const all = JSON.parse(localStorage.getItem("rello.dev.resumes")!);
    all[0].content.experience = "broken";
    localStorage.setItem("rello.dev.resumes", JSON.stringify(all));
  });
  await page.goto(`/r/${id}`);
  await expect(page.getByRole("button", { name: /download.*recovery/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Full name" })).toHaveCount(0);
});

test("review saves accepted text and independent skills choices together", async ({ page }) => {
  await page.goto("/resumes");
  const copy = {
    ...resume,
    id: "b8ef324b-5f7d-4724-a0d7-79ba38f25fc2",
    sourceResumeId: id,
    title: "Fictional tailored copy",
  };
  const session: TailorSession = {
    id: "review-fixture",
    resumeId: copy.id,
    sourceResumeId: id,
    jobId: "job-fixture",
    description: "Fictional job description",
    createdAt: resume.createdAt,
    revision: 1,
    job: { title: "Designer", company: "Fictional" },
    requirements: [],
    suggestions: [
      {
        id: "suggestion",
        targetId: "summary",
        section: "summary",
        original: SAMPLE_CONTENT.summary,
        suggested: "A fictional summary checked by this test.",
        reason: "Fictional review fixture",
        status: "pending",
      },
    ],
    skills: {
      order: [...SAMPLE_CONTENT.skills.map((s) => s.id)].reverse(),
      add: [
        { name: "Merchant onboarding", evidence: "s_b1" },
        { name: "Small-business research", evidence: "s_b3" },
      ],
      status: "pending",
    },
  };
  await page.evaluate(
    ({ copy, session }) => {
      const all = JSON.parse(localStorage.getItem("rello.dev.resumes")!);
      localStorage.setItem("rello.dev.resumes", JSON.stringify([...all, copy]));
      localStorage.setItem("rello.dev.tailor", JSON.stringify([session]));
    },
    { copy, session },
  );
  await page.goto(`/r/${copy.id}/tailor`);
  await page.getByRole("button", { name: "Use suggestion", exact: true }).click();
  await page.getByRole("checkbox", { name: "Use this skills order" }).uncheck();
  await page.getByRole("checkbox", { name: /Merchant onboarding/ }).uncheck();
  await page.getByRole("button", { name: "Apply selected changes" }).click();
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();
  const workspace = await page.evaluate(() => JSON.parse(localStorage.getItem("rello.dev.workspace")!));
  const saved = workspace.resumes.find((r: { id: string }) => r.id === copy.id);
  expect(saved.content.summary).toBe(session.suggestions[0].suggested);
  expect(saved.content.skills.slice(0, SAMPLE_CONTENT.skills.length)).toEqual(SAMPLE_CONTENT.skills);
  expect(saved.content.skills.at(-1).name).toBe("Small-business research");
  expect(workspace.sessions[0].skills.status).toBe("accepted");
  expect(workspace.sessions[0].suggestions[0].status).toBe("accepted");
  await page.reload();
  await expect(page.getByText("Skills · Accepted")).toBeVisible();
});

test("canceling tailoring preserves the pasted job", async ({ page }) => {
  await page.route("**/api/tailor", () => {});
  await page.goto(`/r/${id}/tailor`);
  const input = page.getByRole("textbox", { name: "Job description", exact: true });
  const description =
    "Fictional product design role: improve merchant onboarding, collaborate with engineers and conduct usability testing for small businesses.";
  await input.fill(description);
  await page.getByRole("button", { name: "Get suggestions" }).click();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(input).toHaveValue(description);
  await expect(page.getByText(/Request cancelled/)).toBeVisible();
});

test("exports a real PDF and imports its text within bounded workers", async ({ page }) => {
  await page.goto("/print");
  const exported = await page.request.post("/api/pdf", {
    data: { id, title: resume.title, templateId: resume.templateId, content: SAMPLE_CONTENT },
    timeout: 60000,
  });
  expect(exported.status(), await exported.text()).toBe(200);
  const pdf = await exported.body();
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  const imported = await page.request.post("/api/import", {
    multipart: { file: { name: "fictional.pdf", mimeType: "application/pdf", buffer: pdf } },
    timeout: 90000,
  });
  expect(imported.status(), await imported.text()).toBe(200);
  const data = await imported.json();
  expect(data.sample).toBe(true);
  expect(data.content.personal.name).toBe("Amara Okafor");
});
