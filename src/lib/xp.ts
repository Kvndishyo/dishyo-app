// Level n requires 100 * n^1.5 cumulative XP (level 1 = 0 XP).
export const XP_RULES = { post: 50, comment: 10, reaction: 2, receivedComment: 3, receivedReaction: 1 } as const;
export const MAX_LEVEL = 100;
// One title per 10-level band: 1-9, 10-19, ..., 90-100.
export const TITLES = ["Commis", "Apprenti", "Cuisinier", "Chef de partie", "Sous-chef", "Chef", "Chef étoilé", "Grand chef", "Maître cuisinier", "Légende"];
export const titleForLevel = (lvl: number) => TITLES[Math.min(Math.floor(lvl / 10), TITLES.length - 1)];
export const PLUS_MULTIPLIER = 2;
export const xpForLevel = (lvl: number) => Math.round(100 * Math.pow(lvl - 1, 1.5));
export function levelInfo(xp: number) {
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) level++;
  const cur = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, title: titleForLevel(level), current: xp - cur, needed: next - cur, progress: (xp - cur) / (next - cur) };
}

export const STREAK_BOOST_DAYS = 7;
export const STREAK_MULTIPLIER = 1.5;
/** Active streak: last post today or yesterday (Paris date strings YYYY-MM-DD). */
export function activeStreak(streak: number, lastDay: string | null, today: string) {
  if (!lastDay) return 0;
  const diff = (Date.parse(today) - Date.parse(lastDay)) / 86400000;
  return diff <= 1 ? streak : 0;
}
export const streakMultiplier = (s: number) => (s >= STREAK_BOOST_DAYS ? STREAK_MULTIPLIER : 1);
export const parisToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
