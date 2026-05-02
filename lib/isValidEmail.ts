/**
 * Client-side email shape check (not a full RFC 5322 parser).
 * Rejects obvious non-emails: missing @, bad domain/TLD, consecutive dots, etc.
 *
 * Pattern derived from the same practical regex used by Zod v3 for `.email()`.
 */
const PRACTICAL_EMAIL =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

export function isValidEmail(input: string): boolean {
  const s = input.trim();
  if (s.length < 5 || s.length > 254) return false;
  if (/\s/.test(s)) return false;
  const at = s.indexOf("@");
  if (at !== s.lastIndexOf("@")) return false;
  return PRACTICAL_EMAIL.test(s);
}
