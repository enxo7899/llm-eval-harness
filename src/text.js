/** Lower-case, strip accents and punctuation, collapse spaces. */
export function fold(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9%+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const words = (s) => (s.trim() ? s.trim().split(/\s+/) : []);
