import parser from "cron-parser";

export function validateCronExpression(
  expression: string,
  timezone: string,
): void {
  try {
    parser.parse(expression, { tz: timezone });
  } catch {
    throw new Error(
      `Invalid cron expression '${expression}' for timezone '${timezone}'`,
    );
  }
}

export function getNextRunAt(
  expression: string,
  timezone: string,
  fromDate: Date = new Date(),
): Date {
  const interval = parser.parse(expression, {
    currentDate: fromDate,
    tz: timezone,
  });
  return interval.next().toDate();
}
