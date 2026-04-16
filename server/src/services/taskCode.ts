import crypto from "crypto";

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates a unique-looking code: TSK-<digits>-<3 alphanumeric>
 * Uniqueness against DB is enforced at insert time via retry.
 */
export function randomSuffix(length = 3): string {
  let s = "";
  for (let i = 0; i < length; i += 1) {
    const idx = crypto.randomInt(0, ALPHANUM.length);
    s += ALPHANUM[idx];
  }
  return s;
}

export function generateTaskCode(): string {
  const num = crypto.randomInt(1000, 10000);
  return `TSK-${num}-${randomSuffix(3)}`;
}
