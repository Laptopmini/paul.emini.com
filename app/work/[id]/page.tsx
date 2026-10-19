import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import s from '@/components/cards/cards.module.css';
import { Icon } from '@/components/Icon';
import { JsonLd } from '@/components/JsonLd';
import { RichText } from '@/components/RichText';
import layout from '@/components/resume/layout.module.css';
import { Mention } from '@/components/resume/Mention';
import { OnThisPage } from '@/components/resume/OnThisPage';
import { PageTop } from '@/components/resume/PageTop';
import styles from '@/components/resume/resume.module.css';
import { ScrollSpy } from '@/components/resume/ScrollSpy';
import { caseStudies, experience, mentions, profile, recommendations } from '@/lib/content';
import { formatYearMonth } from '@/lib/format';
import { caseStudyData, pageMetadata } from '@/lib/seo';

// One page per case study (/work/<id>/): the owner's write-up, word for word, with the
// public mention it led to. People named in the text who also wrote a recommendation
// link to it on /resume.

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudies.map((c) => ({ id: c.id }));
}

type Props = { params: Promise<{ id: string }> };

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
      <Link key={i} href={`/resume/#${rec.id}`} className={s.inlineLink}>
        {part}
      </Link>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text, never reordered
      <RichText key={i} text={part} />
    );
  });
}

export default async function CaseStudyPage({ params }: Props) {
  const { id } = await params;
  const study = caseStudies.find((c) => c.id === id);
  if (!study) notFound();
  const role = experience.find((e) => e.id === study.experienceId);
  const credits = mentions.filter((m) => m.caseStudyId === study.id);
  const sections = study.sections.map((s) => ({ id: s.id, label: s.navLabel ?? s.heading }));

  return (
    <div className={layout.page}>
      <JsonLd data={caseStudyData(study)} />
      <PageTop current="case-study">
        <OnThisPage sections={sections} variant="picker" />
      </PageTop>
      <main className={layout.wrap}>
        <article>
          <header className={styles.intro}>
            <p className={styles.location}>
              Case study · {role?.company} · {formatYearMonth(study.start)} –{' '}
              {formatYearMonth(study.end)}
            </p>
            <h1 className={styles.caseTitle}>{study.title}</h1>
            <p className={styles.summary}>{study.summary}</p>
            <p className={styles.stack}>
              {study.role} · {study.stack.join(' · ')}
            </p>
          </header>

          <div className={layout.cols}>
            <OnThisPage sections={sections} variant="rail" />
            <div className={layout.content}>
              {study.sections.map((section) => (
                <section key={section.id} aria-labelledby={section.id} className={styles.section}>
                  <h2 id={section.id} className={styles.heading}>
                    {section.heading}
                  </h2>
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 40)} className={styles.text}>
                      {withRecommenderLinks(p)}
                    </p>
                  ))}
                  {section.bullets.length > 0 && (
                    <ul className={styles.list}>
                      {section.bullets.map((b) => (
                        <li key={b.slice(0, 40)}>{withRecommenderLinks(b)}</li>
                      ))}
                    </ul>
                  )}
                  {section.id === 'impact' &&
                    credits.map((m) => <Mention key={m.id} mention={m} />)}
                </section>
              ))}

              <footer className={styles.section}>
                <div className={styles.actions}>
                  <Link href={`/resume/#${study.experienceId}`} className={styles.secondary}>
                    Back to the résumé
                  </Link>
                  <Link href="/" className={styles.primary}>
                    Ask my agent about it <Icon name="arrowUpRight" size={16} />
                  </Link>
                </div>
              </footer>
            </div>
          </div>
        </article>
      </main>
      <ScrollSpy />
    </div>
  );
}
