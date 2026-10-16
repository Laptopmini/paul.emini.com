import Link from 'next/link';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Not found.</h1>
      <p className={styles.lede}>
        <Link href="/">Back to the home page</Link>
      </p>
    </main>
  );
}
