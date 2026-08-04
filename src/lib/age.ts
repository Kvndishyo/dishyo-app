export const MIN_AGE = 15;

/** Âge en années révolues à la date du jour. */
export function computeAge(birthdate: string | Date): number {
  const d = typeof birthdate === "string" ? new Date(`${birthdate}T00:00:00`) : birthdate;
  if (Number.isNaN(d.getTime())) return NaN;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

/** Validation locale (le serveur revérifie systématiquement). */
export function validateBirthdate(value: string): string | null {
  if (!value) return "Indique ta date de naissance.";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Date de naissance invalide.";
  if (d > new Date()) return "Date de naissance invalide.";
  const age = computeAge(value);
  if (age > 120) return "Date de naissance invalide.";
  if (age < MIN_AGE) return `Dishyo est interdit aux moins de ${MIN_AGE} ans.`;
  return null;
}

/** Date max acceptable (aujourd'hui - MIN_AGE ans) au format yyyy-mm-dd, pour l'attribut max. */
export function maxBirthdateInput(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().slice(0, 10);
}

export function minBirthdateInput(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 120);
  return d.toISOString().slice(0, 10);
}

export function formatBirthdate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}
