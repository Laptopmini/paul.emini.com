import type { Metadata } from 'next';
import Link from 'next/link';
import { Award, Recommendation } from '@/components/cards';
import s from '@/components/cards/cards.module.css';
import { ExternalLink } from '@/components/ExternalLink';
import { Icon } from '@/components/Icon';
import { ContactLinks } from '@/components/landing/ContactLinks';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { Mention } from '@/components/resume/Mention';
import styles from '@/components/resume/resume.module.css';
import { formatDate, formatDuration, formatMonthRange } from '@/lib/cards';
import {
  awards,
  caseStudies,
  certifications,
  education,
  experience,
  github,
  mentions,
  profile,
  projects,
  RESUME_PDF,
  recommendationHighlights,
  recommendations,
  skills,
} from '@/lib/content';
import { formatYearMonth, noBreakHyphens } from '@/lib/format';

// The whole résumé as plain, server-rendered HTML, for people who'd rather read than
// ask and for every crawler and AI agent (none of which can use the chat). Same facts
// as the PDF and the agent: all of it comes from /content.

export const metadata: Metadata = {
  title: `Résumé · ${profile.name}`,
  description: `${profile.title} in ${profile.location.city}: experience, projects, skills, recommendations and open-source work.`,
  alternates: { canonical: '/resume/' },
};

const repos = new Map(github.repos.map((r) => [r.name.toLowerCase(), r]));
const ongoing = (end: string | null) => end ?? new Date().toISOString().slice(0, 7);

export default function ResumePage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <header className={styles.intro}>
          <p className={styles.location}>
            <Icon name="pin" size={16} />
            {profile.location.city}, {profile.location.region}
          </p>
          <h1 className={styles.name}>{noBreakHyphens(profile.name)}</h1>
          <p className={styles.role}>{profile.title}</p>
          <p className={styles.summary}>{profile.summary}</p>
          <ContactLinks />
          <div className={styles.actions}>
            <a
              href={RESUME_PDF}
              download={`${profile.name.replaceAll(' ', '-')}-Resume.pdf`}
              className={styles.primary}
            >
              <Icon name="download" /> Download PDF
            </a>
            <Link href="/" className={styles.secondary}>
              Ask my agent instead
            </Link>
          </div>
        </header>

        <section aria-labelledby="highlights" className={styles.section}>
          <h2 id="highlights" className={styles.heading}>
            Highlights
          </h2>
          <div className={styles.grid}>
            {caseStudies.map((c) => (
              <article key={c.id} className={styles.teaser}>
                <p className={s.mono}>Case study</p>
                <h3 className={`${s.title} ${s.titleMd}`}>{c.title}</h3>
                <p className={s.body}>{c.summary}</p>
                <Link href={`/work/${c.id}/`} className={styles.more}>
                  Read the case study <Icon name="arrowUpRight" size={16} />
                </Link>
              </article>
            ))}
            {mentions.map((m) => (
              <Mention key={m.id} mention={m} />
            ))}
            {awards.map((a) => (
              <Award key={a.id} award={a} />
            ))}
          </div>
        </section>

        <section aria-labelledby="experience" className={styles.section}>
          <h2 id="experience" className={styles.heading}>
            Experience
          </h2>
          {experience.map((e) => (
            <article key={e.id} id={e.id} className={styles.entry}>
              <header className={styles.entryHead}>
                <h3 className={styles.entryTitle}>{e.company}</h3>
                <p className={styles.entryMeta}>
                  {e.title} · {e.location} · {formatMonthRange(e.start, e.end)} ·{' '}
                  {formatDuration(e.start, ongoing(e.end))}
                </p>
              </header>
              <ul className={styles.list}>
                {e.highlights.map((h) => (
                  <li key={h.label}>
                    <strong>{h.label}:</strong> {h.text}
                  </li>
                ))}
              </ul>
              {caseStudies
                .filter((c) => c.experienceId === e.id)
                .map((c) => (
                  <p key={c.id} className={styles.related}>
                    Case study:{' '}
                    <Link href={`/work/${c.id}/`} className={s.inlineLink}>
                      {c.title}
                    </Link>
                  </p>
                ))}
              <p className={styles.stack}>
                <span className="sr-only">Tech stack: </span>
                {e.stack.join(' · ')}
              </p>
            </article>
          ))}
        </section>

        <section aria-labelledby="projects" className={styles.section}>
          <h2 id="projects" className={styles.heading}>
            Projects
          </h2>
          {projects.map((p) => {
            const repo = p.repo ? repos.get(p.repo.split('/')[1]?.toLowerCase() ?? '') : undefined;
            const href = repo?.url ?? (p.repo ? `https://github.com/${p.repo}` : undefined);
            return (
              <article key={p.id} id={p.id} className={styles.entry}>
                <header className={styles.entryHead}>
                  <h3 className={styles.entryTitle}>{p.name}</h3>
                  <p className={styles.entryMeta}>
                    {p.tagline} · {p.kind} · {formatYearMonth(p.date)}
                    {repo ? ` · ★ ${repo.stars} · last push ${formatDate(repo.pushedAt)}` : ''}
                  </p>
                </header>
                <p className={styles.text}>{p.summary}</p>
                <ul className={styles.list}>
                  {p.highlights.map((h) => (
                    <li key={h.label}>
                      <strong>{h.label}:</strong> {h.text}
                    </li>
                  ))}
                </ul>
                <p className={styles.stack}>
                  <span className="sr-only">Tech stack: </span>
                  {p.stack.join(' · ')}
                </p>
                {href && (
                  <ExternalLink href={href} className={styles.more}>
                    View the repo on GitHub <Icon name="arrowUpRight" size={16} />
                  </ExternalLink>
                )}
              </article>
            );
          })}
        </section>

        <section aria-labelledby="skills" className={styles.section}>
          <h2 id="skills" className={styles.heading}>
            Skills
          </h2>
          <dl className={styles.skills}>
            {skills.map((g) => (
              <div key={g.id}>
                <dt>{g.label}</dt>
                <dd>{g.items.join(', ')}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="recommendations" className={styles.section}>
          <h2 id="recommendations" className={styles.heading}>
            Recommendations
          </h2>
          <div className={styles.stackList}>
            {recommendations.map((r) => (
              <Recommendation
                key={r.id}
                id={r.id}
                recommendation={r}
                excerpt={recommendationHighlights[r.id]}
                full
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="education" className={styles.section}>
          <h2 id="education" className={styles.heading}>
            Education &amp; certifications
          </h2>
          <ul className={styles.plain}>
            {education.map((e) => (
              <li key={e.id}>
                <strong>{e.degree}</strong>, {e.school}
              </li>
            ))}
            {certifications.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>, {c.issuer} · {formatYearMonth(c.issued)}
              </li>
            ))}
          </ul>
        </section>

        {github.contributions.length > 0 && (
          <section aria-labelledby="open-source" className={styles.section}>
            <h2 id="open-source" className={styles.heading}>
              Open source
            </h2>
            <p className={styles.text}>
              Recent pull requests and issues on projects I don’t own, refreshed daily from{' '}
              <ExternalLink href={profile.links.github} className={s.inlineLink}>
                GitHub
              </ExternalLink>
              .
            </p>
            <ul className={styles.plain}>
              {github.contributions.slice(0, 10).map((c) => (
                <li key={c.url}>
                  <ExternalLink href={c.url} className={s.inlineLink}>
                    {c.title}
                  </ExternalLink>{' '}
                  · {c.repo} · {c.kind === 'pr' ? `PR, ${c.state}` : `issue, ${c.state}`} ·{' '}
                  {formatDate(c.updatedAt)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
