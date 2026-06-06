import styles from "./footer.module.scss";
import { Separator } from "./separator";

export default function Footer() {
  return (
    <footer className={styles.container}>
      <Separator />

      <div className={styles.content}>
        <p className={styles.copyright}>
          &copy; Slot Hunters &middot; Hack Start Vienna 2026
        </p>
      </div>
    </footer>
  );
}
