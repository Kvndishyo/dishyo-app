// Level n requires 100 * n^1.5 cumulative XP (level 1 = 0 XP).
export const XP_RULES = { post: 50, comment: 10, reaction: 2, receivedComment: 3, receivedReaction: 1 } as const;
const TITLES = ["Commis", "Apprenti", "Cuisinier", "Chef de partie", "Sous-chef", "Chef", "Chef étoilé", "Grand chef", "Légende"];
export const xpForLevel = (lvl: number) => Math.round(100 * Math.pow(lvl - 1, 1.5));
export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const cur = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, title: TITLES[Math.min(Math.floor((level - 1) / 3), TITLES.length - 1)], current: xp - cur, needed: next - cur, progress: (xp - cur) / (next - cur) };
}
