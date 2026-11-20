import { emptyContent } from "@/features/resumes/schema";
import { tailor } from "@/features/tailor/engine";
import { beforeEach, describe, expect, it, vi } from "vitest";
const ai = vi.hoisted(() => ({ chatJSON: vi.fn(), aiConfigured: vi.fn(() => true) }));
vi.mock("@/features/ai/openrouter", () => ({
  ...ai,
  demoAllowed: () => false,
  AIError: class extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));
beforeEach(() => {
  ai.chatJSON.mockReset();
  ai.aiConfigured.mockReturnValue(true);
});
const usage = { model: "fixture", inputTokens: 1, outputTokens: 1 };
describe("tailoring evidence", () => {
  it("reviews a skills-only answer and requires whole names in cited evidence", async () => {
    const content = emptyContent();
    content.summary = "Built JavaScript interfaces. No Java experience.";
    ai.chatJSON.mockResolvedValueOnce({
      data: {
        job: { title: "Engineer", company: "" },
        requirements: [],
        suggestions: [],
        skills: {
          order: [],
          add: [
            { name: "Java", evidence: "summary" },
            { name: "JavaScript", evidence: "summary" },
          ],
        },
      },
      usage,
    });
    ai.chatJSON.mockResolvedValueOnce({
      data: { approved: [], requirements: [], skills: ["Java", "JavaScript"] },
      usage,
    });
    const { result } = await tailor(content, "Build accessible JavaScript interfaces.", {});
    expect(ai.chatJSON).toHaveBeenCalledTimes(2);
    expect(result.skills?.add.map((a) => a.name)).toEqual(["JavaScript"]);
  });
  it("downgrades requirement claims rejected by independent evidence review", async () => {
    const content = emptyContent();
    content.summary = "Ran usability testing sessions.";
    ai.chatJSON.mockResolvedValueOnce({
      data: {
        job: { title: "Researcher", company: "" },
        requirements: [
          { text: "Customer interviews", kind: "required", status: "covered", evidence: ["summary"] },
          { text: "Lead a team", kind: "required", status: "covered", evidence: ["unknown"] },
        ],
        suggestions: [],
        skills: { order: [], add: [] },
      },
      usage,
    });
    ai.chatJSON.mockImplementationOnce(async (options) => {
      const data = JSON.parse(options.user);
      return {
        data: {
          approved: [],
          requirements: data.requirements.map((r: { id: string }) => ({ id: r.id, status: "missing" })),
          skills: [],
        },
        usage,
      };
    });
    const { result } = await tailor(content, "Conduct customer interviews and lead a team.", {});
    expect(result.requirements.every((r) => r.status === "missing" && r.evidence.length === 0)).toBe(true);
  });
  it("fails closed when AI is unavailable outside explicit development demo mode", async () => {
    ai.aiConfigured.mockReturnValue(false);
    await expect(tailor(emptyContent(), "Fictional job", {})).rejects.toMatchObject({
      code: "not_configured",
    });
    expect(ai.chatJSON).not.toHaveBeenCalled();
  });
});
