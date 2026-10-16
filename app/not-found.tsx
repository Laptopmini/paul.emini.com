import styles from './page.module.css';

export default function NotFound() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Not found.</h1>
      <p className={styles.lede}>
        <a href="/">Back to the home page</a>
      </p>
    </main>
  );
}
