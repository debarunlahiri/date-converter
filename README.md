# Date Converter

A dependency-free date conversion utility supplied as three standalone implementations:

- `date-converter.es5.js` — ES5 syntax with CommonJS and browser-global support.
- `date-converter.es6.js` — modern JavaScript ES module.
- `date-converter.ts` — typed TypeScript ES module.

All versions parse a date, interpret it in an optional source timezone, convert it to an optional destination timezone, format it, and also return the canonical UTC ISO 8601 value.

## Quick start

### ES5 / CommonJS

```js
var DateConverter = require("./date-converter.es5.js");

var result = DateConverter.convert("23/09/2026 18:30", {
  inputFormat: "DD/MM/YYYY HH:mm",
  inputTimezone: "Asia/Kolkata",
  outputFormat: "MMMM D, YYYY hh:mm A Z",
  outputTimezone: "America/New_York"
});

console.log(result.formatted);
console.log(result.iso);
```

In a browser, include the ES5 file with a script tag and use `DateConverter.convert(...)`.

### ES6

```js
import { convertDate } from "./date-converter.es6.js";

const result = convertDate("2026-09-23T18:30:00+05:30", {
  outputFormat: "YYYY-MM-DD HH:mm:ss Z",
  outputTimezone: "Europe/London"
});
```

### TypeScript

```ts
import { convertDate, type ConversionResult } from "./date-converter";

const result: ConversionResult = convertDate(1790168400, {
  timestampUnit: "seconds",
  outputTimezone: "Asia/Tokyo",
  outputFormat: "YYYY/MM/DD HH:mm Z"
});
```

## Result

Every `convert`/`convertDate` call returns:

```js
{
  formatted: "September 23, 2026 09:00 AM -04:00",
  iso: "2026-09-23T13:00:00.000Z",
  timestamp: 1790168400000,
  timezone: "America/New_York"
}
```

`iso` is always UTC. `formatted` uses `outputTimezone` and `outputFormat`.

## Options

| Option | Meaning | Default |
| --- | --- | --- |
| `inputFormat` | Exact format of a custom string input | Auto-detect safe formats |
| `inputTimezone` | IANA timezone used when the input has no offset | `UTC` |
| `outputFormat` | Pattern used for `formatted` | `YYYY-MM-DD HH:mm:ss Z` |
| `outputTimezone` | IANA timezone used for the formatted output | `UTC` |
| `timestampUnit` | `milliseconds` or `seconds` for numeric input | `milliseconds` |

Timezone names must be IANA identifiers supported by the runtime, for example `UTC`, `Asia/Kolkata`, `America/New_York`, or `Europe/London`. Daylight-saving offsets are calculated for the date being converted.

## Complete input reference

### Input value types

| Input type | Example | Interpretation |
| --- | --- | --- |
| JavaScript `Date` | `new Date()` | The same instant, copied into a new `Date` |
| Millisecond number | `1790168400000` | Unix timestamp in milliseconds |
| Second number | `1790168400` with `timestampUnit: "seconds"` | Unix timestamp in seconds |
| 13-digit string | `"1790168400000"` | Unix timestamp in milliseconds |
| 10-digit string | `"1790168400"` | Unix timestamp in seconds |
| ISO string | `"2026-09-23T13:00:00.000Z"` | Offset or `Z` in the value determines the instant |
| Custom string | `"23/09/2026 18:30"` | Parsed using `inputFormat` and `inputTimezone` |

### Automatically detected string formats

These inputs do not require `inputFormat`:

| Format | Example |
| --- | --- |
| `YYYY-MM-DD` | `2026-09-23` |
| `YYYY-MM-DD HH:mm` | `2026-09-23 18:30` |
| `YYYY-MM-DDTHH:mm` | `2026-09-23T18:30` |
| `YYYY-MM-DD HH:mm:ss` | `2026-09-23 18:30:45` |
| `YYYY-MM-DDTHH:mm:ss` | `2026-09-23T18:30:45` |
| `YYYY-MM-DD HH:mm:ss.SSS` | `2026-09-23 18:30:45.125` |
| ISO with UTC | `2026-09-23T13:00:00Z` |
| ISO with colon offset | `2026-09-23T18:30:00+05:30` |
| ISO with compact offset | `2026-09-23T18:30:00+0530` |
| 10-digit Unix string | `1790168400` |
| 13-digit Unix string | `1790168400000` |
| Runtime-recognized English date | `September 23, 2026 6:30 PM GMT` |

Inputs without an offset are interpreted in `inputTimezone`, which defaults to `UTC`. English date strings use the JavaScript runtime's built-in date parser, so an explicit `inputFormat` is recommended when consistent cross-runtime behavior matters.

### Custom input formats

Use `inputFormat` for any arrangement constructed from the supported tokens and literal separators:

```js
convertDate("23/09/2026", {
  inputFormat: "DD/MM/YYYY"
});

convertDate("09-23-2026 06:30 PM", {
  inputFormat: "MM-DD-YYYY hh:mm A",
  inputTimezone: "Asia/Kolkata"
});

convertDate("23 Sep 2026 18:30:45 +0530", {
  inputFormat: "DD MMM YYYY HH:mm:ss ZZ"
});

convertDate("September 23, 2026 6:30 PM", {
  inputFormat: "MMMM D, YYYY h:mm A",
  inputTimezone: "Asia/Kolkata"
});
```

Common custom input patterns include:

| Pattern | Example |
| --- | --- |
| `DD/MM/YYYY` | `23/09/2026` |
| `MM/DD/YYYY` | `09/23/2026` |
| `D-M-YYYY` | `23-9-2026` |
| `YYYY/MM/DD` | `2026/09/23` |
| `DD.MM.YYYY` | `23.09.2026` |
| `DD MMM YYYY` | `23 Sep 2026` |
| `D MMMM YYYY` | `23 September 2026` |
| `DD/MM/YYYY HH:mm:ss` | `23/09/2026 18:30:45` |
| `MM-DD-YYYY hh:mm A` | `09-23-2026 06:30 PM` |
| `YYYYMMDD` | `20260923` |
| `YYYY-MM-DDTHH:mm:ssZ` | `2026-09-23T18:30:00+05:30` |
| `YYYY-MM-DDTHH:mm:ss.SSSZ` | `2026-09-23T18:30:00.125+05:30` |

The patterns in the table are examples, not a fixed whitelist. Tokens may be rearranged and combined with spaces or punctuation. Text enclosed in special quote or bracket syntax is not supported; literal letters may conflict with tokens and should be avoided.

Numeric dates such as `03/04/2026` are deliberately not auto-detected because they are ambiguous. Specify either `DD/MM/YYYY` or `MM/DD/YYYY`.

## Complete format-token reference

The same token set is available to `inputFormat` and `outputFormat`.

| Token | Meaning | Accepted input | Example output |
| --- | --- | --- | --- |
| `YYYY` | Four-digit year | Exactly four digits | `2026` |
| `MMMM` | Full English month | English month name, case-insensitive | `September` |
| `MMM` | Short English month | Three-letter month, case-insensitive | `Sep` |
| `MM` | Month number | One or two digits | `09` |
| `M` | Month number | One or two digits | `9` |
| `DD` | Day of month | One or two digits | `23` |
| `D` | Day of month | One or two digits | `23` |
| `HH` | 24-hour value | One or two digits, `0`–`23` | `18` |
| `H` | 24-hour value | One or two digits, `0`–`23` | `18` |
| `hh` | 12-hour value | One or two digits, `1`–`12` | `06` |
| `h` | 12-hour value | One or two digits, `1`–`12` | `6` |
| `mm` | Minutes | One or two digits, `0`–`59` | `30` |
| `m` | Minutes | One or two digits, `0`–`59` | `30` |
| `ss` | Seconds | One or two digits, `0`–`59` | `45` |
| `s` | Seconds | One or two digits, `0`–`59` | `45` |
| `SSS` | Milliseconds | One to three digits | `125` |
| `A` | Meridiem | `AM`, `PM`, `am`, or `pm` | `PM` |
| `Z` | UTC offset with colon | `Z`, `+05:30`, or `-04:00` | `+05:30` |
| `ZZ` | Compact UTC offset | `Z`, `+0530`, or `-0400` | `+0530` |

If `Z` or `ZZ` is present in the input, the supplied offset takes precedence over `inputTimezone`. Use `A` with `h` or `hh`; without `A`, hour values are treated as 24-hour values.

## Complete output reference

`convert` and `convertDate` always return all four output fields:

| Field | Type | Description |
| --- | --- | --- |
| `formatted` | `string` | The requested `outputFormat` rendered in `outputTimezone` |
| `iso` | `string` | Canonical ISO 8601 UTC output from `Date.prototype.toISOString()` |
| `timestamp` | `number` | Unix timestamp in milliseconds |
| `timezone` | `string` | The IANA timezone used for `formatted` |

### Output format examples

For the instant `2026-09-23T13:00:00.125Z` in `Asia/Kolkata`:

| `outputFormat` | Output |
| --- | --- |
| `YYYY-MM-DD` | `2026-09-23` |
| `DD/MM/YYYY` | `23/09/2026` |
| `MM/DD/YYYY` | `09/23/2026` |
| `YYYY/MM/DD HH:mm:ss` | `2026/09/23 18:30:00` |
| `DD MMM YYYY` | `23 Sep 2026` |
| `D MMMM YYYY` | `23 September 2026` |
| `MMMM D, YYYY` | `September 23, 2026` |
| `hh:mm A` | `06:30 PM` |
| `HH:mm:ss` | `18:30:00` |
| `YYYY-MM-DD HH:mm:ss.SSS Z` | `2026-09-23 18:30:00.125 +05:30` |
| `YYYYMMDD-HHmmss` | `20260923-183000` |
| `YYYY-MM-DDTHH:mm:ss.SSSZ` | `2026-09-23T18:30:00.125+05:30` |

The `iso` field for this instant remains `2026-09-23T13:00:00.125Z`, regardless of `outputTimezone` or `outputFormat`.

### Direct parsing and formatting

The implementations also expose lower-level methods:

```js
const date = parseDate("23/09/2026", {
  inputFormat: "DD/MM/YYYY",
  inputTimezone: "Asia/Kolkata"
});

const text = formatDate(
  date,
  "MMMM D, YYYY hh:mm A Z",
  "America/New_York"
);
```

For ES5, the equivalent names are `DateConverter.parse(...)` and `DateConverter.format(...)`.

## Timezone behavior

- Use IANA timezone names such as `UTC`, `Asia/Kolkata`, `America/New_York`, `Europe/London`, or `Australia/Sydney`.
- `inputTimezone` describes a date string that does not already contain `Z` or a numeric offset.
- `outputTimezone` controls only the human-readable `formatted` field.
- `iso` always represents the instant in UTC and ends in `Z`.
- Historical and daylight-saving offsets are calculated for the date being converted, not for the current date.
- A nonexistent wall-clock time during a daylight-saving jump throws `RangeError` instead of silently changing the time.

## Error handling

Invalid dates, mismatched formats, unsupported timezone names, and nonexistent local times during a daylight-saving clock jump throw `RangeError`. Wrap conversion in `try...catch` when processing user-provided values.

The ES5 file uses ES5 language syntax, but IANA timezone conversion requires a runtime with `Intl.DateTimeFormat`, `formatToParts`, and timezone data.
