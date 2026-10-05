/** Join truthy class names. A tiny conditional-className helper for Tailwind. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
