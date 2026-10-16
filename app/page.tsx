import styles from './page.module.css';

// Phase 1 placeholder. The real landing (Main.dc.html) lands in Phase 3.
export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>
        Hi, I’m
        <br />
        <span className={styles.accent}>Paul‑Valentin.</span>
      </h1>
      <p className={styles.lede}>Site under construction.</p>
    </main>
  );
}
