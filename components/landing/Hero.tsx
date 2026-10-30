import { Icon } from '@/components/Icon';
import { profile, surname } from '@/lib/content';
import { noBreakHyphens } from '@/lib/format';
import { ContactLinks } from './ContactLinks';
import styles from './Hero.module.css';

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
