import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 32).toString("hex")}`;
}
export function verifyPassword(password: string, encoded: string) {
  const [method, salt, key] = encoded.split("$");
  if (method !== "scrypt" || !salt || !key || !/^[a-f0-9]{64}$/.test(key))
    return false;
  const actual = scryptSync(password, salt, 32);
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
