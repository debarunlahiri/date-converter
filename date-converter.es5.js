/**
 * Date Converter (ES5 syntax, no dependencies).
 * Made by Debarun Lahiri
 * GitHub: https://github.com/debarunlahiri
 *
 * Requires Intl.DateTimeFormat for IANA time zones such as "Asia/Kolkata".
 *
 * Example:
 * DateConverter.convert("23/09/2026 18:30", {
 *   inputFormat: "DD/MM/YYYY HH:mm",
 *   inputTimezone: "Asia/Kolkata",
 *   outputFormat: "MMMM D, YYYY hh:mm A Z",
 *   outputTimezone: "America/New_York"
 * });
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.DateConverter = api;
  }
}(this, function () {
  "use strict";

  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var TOKEN_PATTERN = /YYYY|MMMM|MMM|MM|DD|HH|hh|mm|ss|SSS|ZZ|Z|A|M|D|H|h|m|s/g;

  function pad(value, length) {
    var text = String(Math.abs(value));
    while (text.length < length) text = "0" + text;
    return text;
  }

  function assertTimezone(timezone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    } catch (error) {
      throw new RangeError("Invalid or unsupported timezone: " + timezone);
    }
  }

  function formatParts(date, timezone) {
    var formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23"
    });
    var values = {};
    formatter.formatToParts(date).forEach(function (part) {
      if (part.type !== "literal") values[part.type] = Number(part.value);
    });
    if (values.hour === 24) values.hour = 0;
    return values;
  }

  function timezoneOffset(date, timezone) {
    var p = formatParts(date, timezone);
    var represented = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    return Math.round((represented - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }

  function localPartsToDate(parts, timezone) {
    assertTimezone(timezone);
    var guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
    var offset = timezoneOffset(new Date(guess), timezone);
    var result = new Date(guess - offset * 60000);
    var correctedOffset = timezoneOffset(result, timezone);
    if (correctedOffset !== offset) result = new Date(guess - correctedOffset * 60000);
    var check = formatParts(result, timezone);
    if (check.year !== parts.year || check.month !== parts.month || check.day !== parts.day ||
        check.hour !== parts.hour || check.minute !== parts.minute || check.second !== parts.second) {
      throw new RangeError("The local time does not exist in " + timezone + " (possible daylight-saving transition).");
    }
    return result;
  }

  function tokenRegex(format) {
    var tokens = [];
    var source = "^";
    var last = 0;
    format.replace(TOKEN_PATTERN, function (token, index) {
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
    return { regex: new RegExp(source), tokens: tokens };
  }

  function parseWithFormat(value, format, timezone) {
    var compiled = tokenRegex(format);
    var match = compiled.regex.exec(String(value).trim());
    var p = { year: 1970, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0 };
    var meridiem = null;
    var zone = null;
    var i;
    if (!match) throw new RangeError("Input does not match inputFormat: " + format);
    for (i = 0; i < compiled.tokens.length; i += 1) {
      var token = compiled.tokens[i];
      var raw = match[i + 1];
      if (token === "YYYY") p.year = Number(raw);
      else if (token === "M" || token === "MM") p.month = Number(raw);
      else if (token === "MMM") p.month = SHORT_MONTHS.map(function (m) { return m.toLowerCase(); }).indexOf(raw.toLowerCase()) + 1;
      else if (token === "MMMM") p.month = MONTHS.map(function (m) { return m.toLowerCase(); }).indexOf(raw.toLowerCase()) + 1;
      else if (token === "D" || token === "DD") p.day = Number(raw);
      else if (token === "H" || token === "HH" || token === "h" || token === "hh") p.hour = Number(raw);
      else if (token === "m" || token === "mm") p.minute = Number(raw);
      else if (token === "s" || token === "ss") p.second = Number(raw);
      else if (token === "SSS") p.millisecond = Number((raw + "00").slice(0, 3));
      else if (token === "A") meridiem = raw.toUpperCase();
      else if (token === "Z" || token === "ZZ") zone = raw;
    }
    if (meridiem) {
      if (p.hour < 1 || p.hour > 12) throw new RangeError("12-hour values must be between 1 and 12.");
      p.hour = p.hour % 12 + (meridiem === "PM" ? 12 : 0);
    }
    validateParts(p);
    if (zone) {
      if (zone === "Z") return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond));
      var sign = zone.charAt(0) === "+" ? 1 : -1;
      var digits = zone.slice(1).replace(":", "");
      var minutes = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4)));
      return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond) - minutes * 60000);
    }
    return localPartsToDate(p, timezone);
  }

  function validateParts(p) {
    var test = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millisecond));
    if (p.month < 1 || p.month > 12 || p.day < 1 || p.day > 31 || p.hour < 0 || p.hour > 23 ||
        p.minute < 0 || p.minute > 59 || p.second < 0 || p.second > 59 ||
        test.getUTCFullYear() !== p.year || test.getUTCMonth() + 1 !== p.month || test.getUTCDate() !== p.day) {
      throw new RangeError("Invalid calendar date or time.");
    }
  }

  function parse(value, options) {
    options = options || {};
    var timezone = options.inputTimezone || "UTC";
    if (Object.prototype.toString.call(value) === "[object Date]") return new Date(value.getTime());
    if (typeof value === "number") return new Date(options.timestampUnit === "seconds" ? value * 1000 : value);
    if (options.inputFormat) return parseWithFormat(value, options.inputFormat, timezone);
    var text = String(value).trim();
    if (/^\d{10}$/.test(text)) return new Date(Number(text) * 1000);
    if (/^\d{13}$/.test(text)) return new Date(Number(text));
    if (/^\d{4}-\d{2}-\d{2}(?:T| )[0-9:.]+(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) return new Date(text.replace(" ", "T"));
    if (/^\d{4}-\d{2}-\d{2}(?:T| )\d{1,2}:\d{2}$/.test(text)) return parseWithFormat(text.replace("T", " "), "YYYY-MM-DD HH:mm", timezone);
    if (/^\d{4}-\d{2}-\d{2}(?:T| )\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?$/.test(text)) return parseWithFormat(text.replace("T", " "), text.indexOf(".") >= 0 ? "YYYY-MM-DD HH:mm:ss.SSS" : "YYYY-MM-DD HH:mm:ss", timezone);
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return parseWithFormat(text, "YYYY-MM-DD", timezone);
    var nativeDate = new Date(text);
    if (!isNaN(nativeDate.getTime()) && /[A-Za-z]/.test(text)) return nativeDate;
    throw new RangeError("Unrecognized or ambiguous date. Provide inputFormat explicitly.");
  }

  function format(date, pattern, timezone) {
    assertTimezone(timezone);
    var p = formatParts(date, timezone);
    var offset = timezoneOffset(date, timezone);
    var sign = offset >= 0 ? "+" : "-";
    var absolute = Math.abs(offset);
    var values = {
      YYYY: pad(p.year, 4), MMMM: MONTHS[p.month - 1], MMM: SHORT_MONTHS[p.month - 1],
      MM: pad(p.month, 2), M: String(p.month), DD: pad(p.day, 2), D: String(p.day),
      HH: pad(p.hour, 2), H: String(p.hour), hh: pad(p.hour % 12 || 12, 2), h: String(p.hour % 12 || 12),
      mm: pad(p.minute, 2), m: String(p.minute), ss: pad(p.second, 2), s: String(p.second),
      SSS: pad(date.getUTCMilliseconds(), 3), A: p.hour < 12 ? "AM" : "PM",
      Z: sign + pad(Math.floor(absolute / 60), 2) + ":" + pad(absolute % 60, 2),
      ZZ: sign + pad(Math.floor(absolute / 60), 2) + pad(absolute % 60, 2)
    };
    return pattern.replace(TOKEN_PATTERN, function (token) { return values[token]; });
  }

  function convert(value, options) {
    options = options || {};
    var date = parse(value, options);
    var timezone = options.outputTimezone || "UTC";
    var pattern = options.outputFormat || "YYYY-MM-DD HH:mm:ss Z";
    if (isNaN(date.getTime())) throw new RangeError("Invalid date value.");
    return {
      formatted: format(date, pattern, timezone),
      iso: date.toISOString(),
      timestamp: date.getTime(),
      timezone: timezone
    };
  }

  return { convert: convert, parse: parse, format: format };
}));
