import { type Recommendation, recommendationsSchema } from './index';

// Parses content/recommendations.md (format in docs/NOTES.md).
// Anything before the first `## ` heading is a preamble and is ignored.

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const FIELDS = {
  title: 'Title',
  company: 'Company',
  relationship: 'Relationship',
  date: 'Date',
  linkedin: 'LinkedIn',
} as const;

/** "June 1, 2026" → "2026-06-01" */
export function toIsoDate(value: string): string {
  const match = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(value.trim());
  const month = match ? MONTHS.indexOf(match[1]?.toLowerCase() ?? '') + 1 : 0;
  if (!match || month === 0) throw new Error(`Unrecognized date "${value}"`);
  return `${match[3]}-${String(month).padStart(2, '0')}-${match[2]?.padStart(2, '0')}`;
}

/** "Dr. Luc Julia" → "luc-julia" */
export function toId(name: string): string {
  return name
    .replace(/^(Dr|Mr|Mrs|Ms|Prof)\.\s+/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function parseRecommendations(markdown: string): Recommendation[] {
  const sections = markdown.split(/^## /m).slice(1);

  const parsed = sections.map((section) => {
    const [heading = '', ...rest] = section.split('\n');
    const name = heading.trim();
    const fields: Record<string, string> = {};
    const body: string[] = [];

    for (const line of rest) {
      const field = /^- \*\*(.+?):\*\*\s*(.+)$/.exec(line);
      if (field && body.length === 0) fields[field[1] ?? ''] = field[2]?.trim() ?? '';
      else body.push(line);
    }

    const get = (key: keyof typeof FIELDS) => {
      const value = fields[FIELDS[key]];
      if (!value) throw new Error(`Recommendation "${name}" is missing **${FIELDS[key]}:**`);
      return value;
    };

    return {
      id: toId(name),
      name,
      title: get('title'),
      company: get('company'),
      relationship: get('relationship'),
      date: toIsoDate(get('date')),
      linkedin: get('linkedin'),
      body: body.join('\n').trim(),
    };
  });

  return recommendationsSchema.parse(parsed);
}
