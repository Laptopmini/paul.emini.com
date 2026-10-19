import { caseStudies, experience, profile, projects } from '@/content';
import { SITE_URL } from '@/lib/brand';
import { RESUME_PDF } from '@/lib/content';
import { formatYearRange } from '@/lib/format';

// /llms.txt (llmstxt.org): a plain Markdown map of the site for language models. A
// proposal with uneven adoption, so it only points to the real pages.
export const dynamic = 'force-static';

export function GET() {
  const url = (path: string) => new URL(path, SITE_URL).href;
  const text = [
    `# ${profile.name}`,
    '',
    `> ${profile.summary}`,
    '',
    `Based in ${profile.location.city}, ${profile.location.region}.`,
    '',
    'The site has an AI agent that answers questions about this career; everything it knows is also on the pages below, as plain HTML.',
    '',
    '## Pages',
    '',
    `- [Résumé](${url('/resume/')}): every role, project, skill, recommendation, certification and recent open-source work`,
    ...caseStudies.map((c) => `- [${c.title}](${url(`/work/${c.id}/`)}): ${c.summary}`),
    `- [Résumé (PDF)](${url(RESUME_PDF)})`,
    `- [GitHub activity (JSON, refreshed daily)](${url('/github.json')})`,
    '',
    '## Experience',
    '',
    ...experience.map(
      (e) =>
        `- ${e.title}, ${e.company} (${formatYearRange(e.start, e.end)}): ${url(`/resume/#${e.id}`)}`,
    ),
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- ${p.name}, ${p.tagline}: ${url(`/resume/#${p.id}`)}`),
    '',
    '## Contact',
    '',
    `- Email: ${profile.email}`,
    ...Object.entries(profile.links).map(
      ([name, href]) => `- ${name === 'github' ? 'GitHub' : 'LinkedIn'}: ${href}`,
    ),
    '',
  ].join('\n');
  return new Response(text, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
}
