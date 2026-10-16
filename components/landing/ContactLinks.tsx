import { Icon, type IconName } from '@/components/Icon';
import { profile } from '@/lib/content';
import { handleFromUrl } from '@/lib/format';
import styles from './ContactLinks.module.css';

type ContactLink = {
  href: string;
  label: string;
  icon: IconName;
  /** Screen-reader context before the visible label, e.g. "GitHub: ". */
  context?: string;
  /** On phones the label is visually hidden so all links fit on one row. */
  compact?: boolean;
};

const links: ContactLink[] = [
  { href: `mailto:${profile.email}`, label: profile.email, icon: 'mail' },
  { href: profile.links.linkedin, label: 'LinkedIn', icon: 'linkedin', compact: true },
  {
    href: profile.links.github,
    label: handleFromUrl(profile.links.github),
    icon: 'github',
    context: 'GitHub: ',
    compact: true,
  },
];

export function ContactLinks() {
  return (
    <nav aria-label="Contact" className={styles.nav}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className={link.compact ? `${styles.link} ${styles.compact}` : styles.link}
        >
          <Icon name={link.icon} />
          <span className={styles.label}>
            {link.context && <span className="sr-only">{link.context}</span>}
            {link.label}
          </span>
        </a>
      ))}
    </nav>
  );
}
