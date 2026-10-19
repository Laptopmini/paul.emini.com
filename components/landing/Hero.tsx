import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { awards, mentions, profile } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import { ContactLinks } from './ContactLinks';
import styles from './Hero.module.css';

/** One quiet line of third-party proof under the tagline, linking to the details. */
function Proof() {
  const [award] = awards;
  const [mention] = mentions;
  if (!award && !mention) return null;
  return (
    <p className={styles.proof}>
      {award && (
        <Link href="/resume/#highlights" className={styles.proofLink}>
          {award.name}, {award.issuer}
        </Link>
      )}
      {award && mention && <span aria-hidden="true"> · </span>}
      {mention && (
        <Link
          href={mention.caseStudyId ? `/work/${mention.caseStudyId}/` : '/resume/#highlights'}
          className={styles.proofLink}
        >
          Named in a launch post by the {mention.authorTitle}
        </Link>
      )}
    </p>
  );
}

export function Hero() {
  return (
    <div className={styles.copy}>
      <p className={styles.location}>
        <Icon name="pin" size={16} />
        {profile.location.city}, {profile.location.region}
      </p>
      <h1 className={styles.title}>
        Hi, I’m
        <br />
        <span className={styles.accent}>{noBreakHyphens(profile.firstName)}.</span>
      </h1>
      <p className={styles.lede}>{`${profile.title} ${profile.tagline}`}</p>
      <Proof />
      <ContactLinks />
    </div>
  );
}
