import { describe, it, expect } from "vitest";
import { XP_RULES, levelInfo } from "../xp";
describe("xp", () => {
  it("a dish earns more than a reaction or comment", () => { expect(XP_RULES.post).toBeGreaterThan(XP_RULES.comment); expect(XP_RULES.comment).toBeGreaterThan(XP_RULES.reaction); });
  it("levels", () => { expect(levelInfo(0).level).toBe(1); expect(levelInfo(100).level).toBe(2); });
});
import { activeStreak, streakMultiplier } from "../xp";
describe("streak", () => {
  it("x1.5 from 7 days", () => { expect(streakMultiplier(6)).toBe(1); expect(streakMultiplier(7)).toBe(1.5); });
  it("breaks after a skipped day", () => { expect(activeStreak(8, "2026-11-17", "2026-11-18")).toBe(8); expect(activeStreak(8, "2026-11-16", "2026-11-18")).toBe(0); });
});
import { titleForLevel, MAX_LEVEL, xpForLevel as xfl } from "../xp";
describe("titles & prestige", () => {
  it("new title every 10 levels", () => { expect(titleForLevel(9)).toBe("Commis"); expect(titleForLevel(10)).toBe("Apprenti"); expect(titleForLevel(100)).toBe("Légende"); });
  it("prestige cap matches level 100 (98504 XP in DB)", () => { expect(MAX_LEVEL).toBe(100); expect(xfl(100)).toBe(98504); expect(levelInfo(10_000_000).level).toBe(100); });
});
