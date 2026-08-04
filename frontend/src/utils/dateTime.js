const FORMATTER_CACHE = new Map();

function getFormatter(timeZone) {
  const cacheKey = timeZone || 'local';
  let formatter = FORMATTER_CACHE.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...(timeZone ? { timeZone } : {}),
    });
    FORMATTER_CACHE.set(cacheKey, formatter);
  }

  return formatter;
}

export function formatDateTime(value, { includeYear = true, timeZone } = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  );

  const datePart = includeYear
    ? `${parts.day}/${parts.month}/${parts.year}`
    : `${parts.day}/${parts.month}`;

  return `${datePart} ${parts.hour}:${parts.minute}`;
}
