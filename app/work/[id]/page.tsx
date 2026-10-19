import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { JsonLd } from '@/components/JsonLd';
import { RichText } from '@/components/RichText';
import { BottomBar } from '@/components/resume/BottomBar';
import { CaseStudyFigure } from '@/components/resume/CaseStudyFigure';
import styles from '@/components/resume/caseStudy.module.css';
import { COPY } from '@/components/resume/copy';
import layout from '@/components/resume/layout.module.css';
import { MentionPanel } from '@/components/resume/MentionPanel';
import { OnThisPage } from '@/components/resume/OnThisPage';
import { PageLink } from '@/components/resume/PageLink';
import { PageTop } from '@/components/resume/PageTop';
import { PrintExpand } from '@/components/resume/PrintExpand';
import { ScrollSpy } from '@/components/resume/ScrollSpy';
import { StatTiles } from '@/components/resume/StatTiles';
import type { CaseStudy } from '@/content';
import { caseStudies, experience, mentions, profile, recommendations } from '@/lib/content';
import { formatYearMonth } from '@/lib/format';
import { readingMinutes, splitLead, splitTitle } from '@/lib/resume';
import { breadcrumbData, caseStudyData, pageMetadata } from '@/lib/seo';

// One page per case study (/work/<id>/): the owner's write-up, word for word, with the
// public mention it led to. People named in the text who also wrote a recommendation
// link to it on /resume.

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudies.map((c) => ({ id: c.id }));
}

type Props = { params: Promise<{ id: string }> };
type Section = CaseStudy['sections'][number];

/** Closing reflections, shown side by side as cards after the body. */
const CLOSING = ['what-id-do-differently', 'whats-next'];
/** The section about what comes next ends with a way to try the agent it describes. */
const NEXT = 'whats-next';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const study = caseStudies.find((c) => c.id === id);
  if (!study) return {};
  return pageMetadata({
    title: `${study.title} · ${profile.name}`,
    description: study.summary,
    path: `/work/${study.id}/`,
    type: 'article',
  });
}

/** Recommenders named in a paragraph become links to their recommendation. */
function withRecommenderLinks(text: string) {
  const names = recommendations.map((r) => r.name).filter((n) => text.includes(n));
  if (names.length === 0) return <RichText text={text} />;
  const pattern = new RegExp(
    `(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
  );
  return text.split(pattern).map((part, i) => {
    const rec = recommendations.find((r) => r.name === part);
    return rec ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text, never reordered
      <PageLink key={i} href={`/resume/#${rec.id}`} className={styles.inlineLink}>
        {part}
      </PageLink>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text, never reordered
      <RichText key={i} text={part} />
    );
  });
}

const kicker = (i: number) => String(i + 1).padStart(2, '0');

function Aside({ aside }: { aside: NonNullable<Section['aside']> }) {
  return (
    <aside className={aside.title ? `${styles.aside} ${styles.asideSolid}` : styles.aside}>
      <p className={layout.mono}>{aside.kicker}</p>
      {aside.title && <strong className={styles.asideTitle}>{aside.title}</strong>}
      <span>{aside.text}</span>
      {aside.href && (
        <PageLink href={aside.href} className={styles.asideLink}>
          {aside.linkLabel} →
        </PageLink>
      )}
    </aside>
  );
}

export default async function CaseStudyPage({ params }: Props) {
  const { id } = await params;
  const study = caseStudies.find((c) => c.id === id);
  if (!study) notFound();
  const role = experience.find((e) => e.id === study.experienceId);
  const credits = mentions.filter((m) => m.caseStudyId === study.id);
  const [titleLead, titleRest] = splitTitle(study.title);
  const nav = study.sections.map((s) => ({ id: s.id, label: s.navLabel ?? s.heading }));
  const minutes = readingMinutes([
    study.summary,
    ...study.sections.flatMap((s) => [...s.paragraphs, ...s.bullets]),
  ]);
  const body = study.sections.filter((s) => !CLOSING.includes(s.id));
  const closing = study.sections.filter((s) => CLOSING.includes(s.id));
  const number = (s: Section) => kicker(study.sections.indexOf(s));

  return (
    <div className={layout.page}>
      <JsonLd data={caseStudyData(study)} />
      <JsonLd data={breadcrumbData(study)} />
      <PageTop current="case-study">
        <OnThisPage sections={nav} variant="picker" />
      </PageTop>
      <main className={layout.wrap}>
        <article>
          <header className={styles.hero}>
            <nav aria-label="Breadcrumb">
              <ol className={styles.breadcrumb}>
                <li>
                  <PageLink href="/resume/">Résumé</PageLink>
                </li>
                {role && (
                  <li>
                    <PageLink href={`/resume/#${role.id}`}>
                      {role.shortName ?? role.company}
                    </PageLink>
                  </li>
                )}
                <li aria-current="page">Case study</li>
              </ol>
            </nav>
            <h1 className={styles.title} style={{ viewTransitionName: `case-${study.id}` }}>
              {titleLead}
              {titleRest && (
                <>
                  {' '}
                  <span className={styles.titleRest}>{titleRest}</span>
                </>
              )}
            </h1>
            <div className={styles.lead}>
              <p className={styles.summary}>{study.summary}</p>
              <dl className={styles.facts}>
                <div>
                  <dt className={layout.mono}>Role</dt>
                  <dd>{study.role}</dd>
                </div>
                {role && (
                  <div>
                    <dt className={layout.mono}>Company</dt>
                    <dd>{role.company}</dd>
                  </div>
                )}
                <div>
                  <dt className={layout.mono}>Timeline</dt>
                  <dd>
                    {formatYearMonth(study.start)} – {formatYearMonth(study.end)}
                  </dd>
                </div>
                {study.designCredit && (
                  <div>
                    <dt className={layout.mono}>Design</dt>
                    <dd>
                      {study.designCredit.recommendationId ? (
                        <PageLink
                          href={`/resume/#${study.designCredit.recommendationId}`}
                          className={styles.factLink}
                        >
                          {study.designCredit.name}
                        </PageLink>
                      ) : (
                        study.designCredit.name
                      )}
                    </dd>
                  </div>
                )}
                <div className={styles.factWide}>
                  <dt className={layout.mono}>Stack</dt>
                  <dd className={styles.stack}>
                    {study.stack.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
            {study.stats && study.stats.length > 0 && (
              <StatTiles stats={study.stats} variant="tiles" />
            )}
          </header>

          <div className={layout.cols}>
            <OnThisPage sections={nav} variant="rail" note={`~${minutes} min read`} />
            <div className={layout.content}>
              {body.map((section) => (
                <section key={section.id} aria-labelledby={section.id} className={styles.section}>
                  <div className={styles.prose}>
                    <p className={styles.kicker}>{number(section)}</p>
                    <h2 id={section.id} className={styles.h2}>
                      {section.heading}
                    </h2>
                    {section.paragraphs.map((p) => (
                      <p key={p.slice(0, 40)} className={styles.text}>
                        {withRecommenderLinks(p)}
                      </p>
                    ))}
                  </div>
                  {section.aside && <Aside aside={section.aside} />}
                  {section.figure && (
                    <div className={styles.full}>
                      <CaseStudyFigure figure={section.figure} />
                    </div>
                  )}
                  {section.bullets.length > 0 &&
                    (section.id === 'impact' ? (
                      <ul className={`${styles.full} ${styles.tiles}`}>
                        {section.bullets.map((b) => {
                          const [lead, rest] = splitLead(b);
                          return (
                            <li key={b.slice(0, 40)} className={layout.card}>
                              {lead && <strong className={styles.tileLead}>{lead}</strong>}{' '}
                              <span>{withRecommenderLinks(rest)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <ul className={`${styles.prose} ${styles.list}`}>
                        {section.bullets.map((b) => (
                          <li key={b.slice(0, 40)}>{withRecommenderLinks(b)}</li>
                        ))}
                      </ul>
                    ))}
                  {section.id === 'impact' &&
                    credits.map((m) => (
                      <div key={m.id} className={styles.full}>
                        <MentionPanel mention={m} />
                      </div>
                    ))}
                </section>
              ))}

              {closing.length > 0 && (
                <div className={styles.closing}>
                  {closing.map((section) => (
                    <section
                      key={section.id}
                      aria-labelledby={section.id}
                      className={`${layout.card} ${styles.closingCard}`}
                    >
                      <p className={styles.kicker}>{number(section)}</p>
                      <h2 id={section.id} className={styles.closingTitle}>
                        {section.heading}
                      </h2>
                      {section.paragraphs.map((p) => (
                        <p key={p.slice(0, 40)}>{withRecommenderLinks(p)}</p>
                      ))}
                      {section.bullets.length > 0 && (
                        <ul className={styles.list}>
                          {section.bullets.map((b) => (
                            <li key={b.slice(0, 40)}>{withRecommenderLinks(b)}</li>
                          ))}
                        </ul>
                      )}
                      {section.id === NEXT && (
                        <Link href="/" className={`${layout.more} ${styles.closingLink}`}>
                          {COPY.tryAgent} <Icon name="arrowUpRight" size={16} />
                        </Link>
                      )}
                    </section>
                  ))}
                </div>
              )}

              <footer className={styles.footer}>
                <PageLink href={`/resume/#${study.experienceId}`} className={layout.ghost}>
                  ← {COPY.backToResume}
                </PageLink>
                <Link href="/" className={layout.primary}>
                  {COPY.askAbout} <Icon name="arrowUpRight" size={16} />
                </Link>
              </footer>
            </div>
          </div>
        </article>
      </main>
      <BottomBar>
        <PageLink href={`/resume/#${study.experienceId}`} className={layout.ghost}>
          Résumé
        </PageLink>
        <Link href="/" className={layout.primary}>
          {COPY.askShort}
        </Link>
      </BottomBar>
      <ScrollSpy />
      <PrintExpand />
    </div>
  );
}
