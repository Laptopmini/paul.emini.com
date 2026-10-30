import { Icon } from '@/components/Icon';
import { profile } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import { ContactLinks } from './ContactLinks';
import styles from './Hero.module.css';

// The content test guarantees the full name starts with the first name.
const surname = profile.name.slice(profile.firstName.length).trim();

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
        <span className={styles.accent}>
          {noBreakHyphens(profile.firstName)}
          {/* The design shows the first name only; search engines and screen readers get the rest. */}
          <span className="sr-only">
            {' '}
            {surname}, {profile.title}
          </span>
          .
        </span>
      </h1>
      <p className={styles.lede}>{profile.tagline}</p>
      <ContactLinks />
    </div>
  );
}
