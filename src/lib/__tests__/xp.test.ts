import { describe, it, expect } from "vitest";
import { XP_RULES, levelInfo } from "../xp";
describe("xp", () => {
  it("a dish earns more than a reaction or comment", () => { expect(XP_RULES.post).toBeGreaterThan(XP_RULES.comment); expect(XP_RULES.comment).toBeGreaterThan(XP_RULES.reaction); });
  it("levels", () => { expect(levelInfo(0).level).toBe(1); expect(levelInfo(100).level).toBe(2); });
});
