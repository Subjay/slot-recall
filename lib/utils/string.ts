export function trim_spaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const SPECIAL_CHAR: Record<string, string> = {
  ae: "ae",
  oe: "oe",
  ss: "ss",
  o: "o",
  d: "d",
  l: "l",
  th: "th",
};

export function normalize_string(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[æǽ]/g, SPECIAL_CHAR.ae)
    .replace(/œ/g, SPECIAL_CHAR.oe)
    .replace(/ß/g, SPECIAL_CHAR.ss)
    .replace(/[øöð]/g, SPECIAL_CHAR.o)
    .replace(/[đ]/g, SPECIAL_CHAR.d)
    .replace(/[ł]/g, SPECIAL_CHAR.l)
    .replace(/[þ]/g, SPECIAL_CHAR.th)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
