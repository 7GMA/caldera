// Bidirectional RRULE <-> Microsoft Graph recurrence pattern converter

interface GraphRecurrencePattern {
  type: string;
  interval: number;
  daysOfWeek?: string[];
  dayOfMonth?: number;
  month?: number;
  firstDayOfWeek?: string;
  index?: string;
}

interface GraphRecurrenceRange {
  type: string;
  startDate: string;
  endDate?: string;
  numberOfOccurrences?: number;
}

interface GraphRecurrence {
  pattern: GraphRecurrencePattern;
  range: GraphRecurrenceRange;
}

const DAY_MAP: Record<string, string> = {
  MO: "monday", TU: "tuesday", WE: "wednesday", TH: "thursday",
  FR: "friday", SA: "saturday", SU: "sunday",
};
const DAY_MAP_REV: Record<string, string> = Object.fromEntries(
  Object.entries(DAY_MAP).map(([k, v]) => [v, k]),
);
const ORDINAL_MAP: Record<string, string> = {
  "1": "first", "2": "second", "3": "third", "4": "fourth", "-1": "last",
};

export function rruleToGraph(rruleStr: string, startDate: string): GraphRecurrence {
  const clean = rruleStr.replace(/^RRULE:/, "");
  const parts = Object.fromEntries(
    clean.split(";").map((p) => p.split("=") as [string, string]),
  );

  const freq = parts["FREQ"] ?? "WEEKLY";
  const interval = parseInt(parts["INTERVAL"] ?? "1", 10);
  const byday = parts["BYDAY"]?.split(",") ?? [];
  const bymonthday = parts["BYMONTHDAY"] ? parseInt(parts["BYMONTHDAY"], 10) : undefined;
  const bymonth = parts["BYMONTH"] ? parseInt(parts["BYMONTH"], 10) : undefined;
  const until = parts["UNTIL"];
  const count = parts["COUNT"] ? parseInt(parts["COUNT"], 10) : undefined;

  let patternType: string;
  let daysOfWeek: string[] | undefined;
  let dayOfMonth: number | undefined;
  let month: number | undefined;
  let index: string | undefined;

  if (freq === "DAILY") {
    patternType = "daily";
  } else if (freq === "WEEKLY") {
    patternType = "weekly";
    daysOfWeek = byday.map((d) => DAY_MAP[d.replace(/^[+-\d]+/, "")] ?? "monday");
  } else if (freq === "MONTHLY") {
    if (bymonthday) {
      patternType = "absoluteMonthly";
      dayOfMonth = bymonthday;
    } else if (byday.length === 1) {
      patternType = "relativeMonthly";
      const match = byday[0]!.match(/^([+-]?\d+)(\w+)$/);
      if (match) {
        index = ORDINAL_MAP[match[1]!] ?? "first";
        daysOfWeek = [DAY_MAP[match[2]!] ?? "monday"];
      }
    } else {
      patternType = "absoluteMonthly";
      dayOfMonth = 1;
    }
  } else if (freq === "YEARLY") {
    patternType = bymonthday ? "absoluteYearly" : "relativeYearly";
    dayOfMonth = bymonthday;
    month = bymonth;
    if (byday.length === 1) {
      daysOfWeek = [DAY_MAP[byday[0]!.replace(/^[+-\d]+/, "")] ?? "monday"];
    }
  } else {
    patternType = "weekly";
  }

  const range: GraphRecurrenceRange = {
    type: until ? "endDate" : count ? "numbered" : "noEnd",
    startDate,
    ...(until ? { endDate: until.slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") } : {}),
    ...(count ? { numberOfOccurrences: count } : {}),
  };

  return {
    pattern: {
      type: patternType,
      interval,
      ...(daysOfWeek ? { daysOfWeek } : {}),
      ...(dayOfMonth !== undefined ? { dayOfMonth } : {}),
      ...(month !== undefined ? { month } : {}),
      ...(index ? { index } : {}),
    },
    range,
  };
}

export function graphToRrule(recurrence: GraphRecurrence): string {
  const { pattern, range } = recurrence;
  const parts: string[] = [];

  const freqMap: Record<string, string> = {
    daily: "DAILY",
    weekly: "WEEKLY",
    absoluteMonthly: "MONTHLY",
    relativeMonthly: "MONTHLY",
    absoluteYearly: "YEARLY",
    relativeYearly: "YEARLY",
  };
  parts.push(`FREQ=${freqMap[pattern.type] ?? "WEEKLY"}`);

  if (pattern.interval > 1) parts.push(`INTERVAL=${pattern.interval}`);

  if (pattern.daysOfWeek?.length) {
    const days = pattern.daysOfWeek.map((d) => DAY_MAP_REV[d] ?? "MO");
    if (pattern.type === "relativeMonthly" || pattern.type === "relativeYearly") {
      const ordRev = Object.fromEntries(Object.entries(ORDINAL_MAP).map(([k, v]) => [v, k]));
      const pos = ordRev[pattern.index ?? "first"] ?? "1";
      parts.push(`BYDAY=${pos}${days[0]}`);
    } else {
      parts.push(`BYDAY=${days.join(",")}`);
    }
  }

  if (pattern.dayOfMonth) parts.push(`BYMONTHDAY=${pattern.dayOfMonth}`);
  if (pattern.month) parts.push(`BYMONTH=${pattern.month}`);

  if (range.type === "endDate" && range.endDate) {
    parts.push(`UNTIL=${range.endDate.replace(/-/g, "")}T000000Z`);
  } else if (range.type === "numbered" && range.numberOfOccurrences) {
    parts.push(`COUNT=${range.numberOfOccurrences}`);
  }

  return parts.join(";");
}
