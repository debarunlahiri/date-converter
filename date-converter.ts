/**
 * Typed TypeScript version of the dependency-free date converter.
 * Made by Debarun Lahiri
 * GitHub: https://github.com/debarunlahiri
 */
export type DateInput = string | number | Date;
export type TimestampUnit = "milliseconds" | "seconds";

export interface ConvertOptions {
  inputFormat?: string;
  inputTimezone?: string;
  outputFormat?: string;
  outputTimezone?: string;
  timestampUnit?: TimestampUnit;
}

export interface ConversionResult {
  formatted: string;
  iso: string;
  timestamp: number;
  timezone: string;
}

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = MONTHS.map((month) => month.slice(0, 3));
const TOKENS = /YYYY|MMMM|MMM|MM|DD|HH|hh|mm|ss|SSS|ZZ|Z|A|M|D|H|h|m|s/g;
const pad = (value: number, length = 2): string => String(Math.abs(value)).padStart(length, "0");

function assertTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new RangeError(`Invalid or unsupported timezone: ${timezone}`);
  }
}

function getParts(date: Date, timezone: string): DateParts {
  const result: Partial<DateParts> = { millisecond: date.getUTCMilliseconds() };
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") (result as Record<string, number>)[part.type] = Number(part.value);
  }
  if (result.hour === 24) result.hour = 0;
  return result as DateParts;
}

function getOffset(date: Date, timezone: string): number {
  const p = getParts(date, timezone);
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

function validate(p: DateParts): void {
  const test = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond));
  if (p.month < 1 || p.month > 12 || p.day < 1 || p.day > 31 || p.hour < 0 || p.hour > 23 ||
      p.minute < 0 || p.minute > 59 || p.second < 0 || p.second > 59 ||
      test.getUTCFullYear() !== p.year || test.getUTCMonth() + 1 !== p.month || test.getUTCDate() !== p.day) {
    throw new RangeError("Invalid calendar date or time.");
  }
}

function fromZonedParts(p: DateParts, timezone: string): Date {
  assertTimezone(timezone);
  const guess = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond);
  const offset = getOffset(new Date(guess), timezone);
  let date = new Date(guess - offset * 60000);
  const correctedOffset = getOffset(date, timezone);
  if (correctedOffset !== offset) date = new Date(guess - correctedOffset * 60000);
  const check = getParts(date, timezone);
  const keys: Array<keyof DateParts> = ["year", "month", "day", "hour", "minute", "second"];
  if (keys.some((key) => check[key] !== p[key])) {
    throw new RangeError(`The local time does not exist in ${timezone} (possible daylight-saving transition).`);
  }
  return date;
}

function compileFormat(format: string): { regex: RegExp; tokens: string[] } {
  const tokens: string[] = [];
  let source = "^";
  let last = 0;
  format.replace(TOKENS, (token, index: number) => {
    source += format.slice(last, index).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    tokens.push(token);
    if (token === "YYYY") source += "(\\d{4})";
    else if (token === "MMMM") source += "([A-Za-z]+)";
    else if (token === "MMM") source += "([A-Za-z]{3})";
    else if (token === "A") source += "(AM|PM|am|pm)";
    else if (token === "SSS") source += "(\\d{1,3})";
    else if (token === "Z" || token === "ZZ") source += "(Z|[+-]\\d{2}:?\\d{2})";
    else source += "(\\d{1,2})";
    last = index + token.length;
    return token;
  });
  source += format.slice(last).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$";
  return { regex: new RegExp(source), tokens };
}

export function parseDate(value: DateInput, options: ConvertOptions = {}): Date {
  const timezone = options.inputTimezone || "UTC";
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === "number") return new Date(options.timestampUnit === "seconds" ? value * 1000 : value);
  const text = value.trim();
  if (!options.inputFormat) {
    if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000);
    if (/^\d{13}$/.test(text)) return new Date(Number(text));
    if (/^\d{4}-\d{2}-\d{2}(?:T| )[0-9:.]+(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) return new Date(text.replace(" ", "T"));
    if (/^\d{4}-\d{2}-\d{2}(?:T| )\d{1,2}:\d{2}$/.test(text)) return parseDate(text.replace("T", " "), { inputFormat: "YYYY-MM-DD HH:mm", inputTimezone: timezone });
    if (/^\d{4}-\d{2}-\d{2}(?:T| )\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(text)) return parseDate(text.replace("T", " "), { inputFormat: text.includes(".") ? "YYYY-MM-DD HH:mm:ss.SSS" : "YYYY-MM-DD HH:mm:ss", inputTimezone: timezone });
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return parseDate(text, { inputFormat: "YYYY-MM-DD", inputTimezone: timezone });
    const nativeDate = new Date(text);
    if (!Number.isNaN(nativeDate.getTime()) && /[A-Za-z]/.test(text)) return nativeDate;
    throw new RangeError("Unrecognized or ambiguous date. Provide inputFormat explicitly.");
  }
  const { regex, tokens } = compileFormat(options.inputFormat);
  const match = regex.exec(text);
  if (!match) throw new RangeError(`Input does not match inputFormat: ${options.inputFormat}`);
  const p: DateParts = { year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 };
  let meridiem: string | null = null;
  let zone: string | null = null;
  tokens.forEach((token, index) => {
    const raw = match[index + 1];
    if (token === "YYYY") p.year = Number(raw);
    else if (["M", "MM"].includes(token)) p.month = Number(raw);
    else if (token === "MMM") p.month = SHORT_MONTHS.findIndex((month) => month.toLowerCase() === raw.toLowerCase()) + 1;
    else if (token === "MMMM") p.month = MONTHS.findIndex((month) => month.toLowerCase() === raw.toLowerCase()) + 1;
    else if (["D", "DD"].includes(token)) p.day = Number(raw);
    else if (["H", "HH", "h", "hh"].includes(token)) p.hour = Number(raw);
    else if (["m", "mm"].includes(token)) p.minute = Number(raw);
    else if (["s", "ss"].includes(token)) p.second = Number(raw);
    else if (token === "SSS") p.millisecond = Number((raw + "00").slice(0, 3));
    else if (token === "A") meridiem = raw.toUpperCase();
    else if (["Z", "ZZ"].includes(token)) zone = raw;
  });
  if (meridiem) {
    if (p.hour < 1 || p.hour > 12) throw new RangeError("12-hour values must be between 1 and 12.");
    p.hour = p.hour % 12 + (meridiem === "PM" ? 12 : 0);
  }
  validate(p);
  if (!zone) return fromZonedParts(p, timezone);
  if (zone === "Z") return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond));
  const sign = zone.startsWith("+") ? 1 : -1;
  const digits = zone.slice(1).replace(":", "");
  const offset = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2)));
  return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond) - offset * 60000);
}

export function formatDate(date: Date, pattern = "YYYY-MM-DD HH:mm:ss Z", timezone = "UTC"): string {
  assertTimezone(timezone);
  const p = getParts(date, timezone);
  const offset = getOffset(date, timezone);
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);
  const values: Record<string, string> = {
    YYYY: pad(p.year, 4), MMMM: MONTHS[p.month - 1], MMM: SHORT_MONTHS[p.month - 1],
    MM: pad(p.month), M: String(p.month), DD: pad(p.day), D: String(p.day),
    HH: pad(p.hour), H: String(p.hour), hh: pad(p.hour % 12 || 12), h: String(p.hour % 12 || 12),
    mm: pad(p.minute), m: String(p.minute), ss: pad(p.second), s: String(p.second),
    SSS: pad(date.getUTCMilliseconds(), 3), A: p.hour < 12 ? "AM" : "PM",
    Z: `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`,
    ZZ: `${sign}${pad(Math.floor(absolute / 60))}${pad(absolute % 60)}`
  };
  return pattern.replace(TOKENS, (token) => values[token]);
}

export function convertDate(value: DateInput, options: ConvertOptions = {}): ConversionResult {
  const date = parseDate(value, options);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date value.");
  const timezone = options.outputTimezone || "UTC";
  return {
    formatted: formatDate(date, options.outputFormat || "YYYY-MM-DD HH:mm:ss Z", timezone),
    iso: date.toISOString(),
    timestamp: date.getTime(),
    timezone
  };
}

export default { convert: convertDate, parse: parseDate, format: formatDate };
