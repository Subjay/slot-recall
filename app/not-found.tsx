import { Metadata } from "next";
import Link from "next/link";

import styles from "./not-found.module.scss";

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: {
      canonical: `/not-found`,
    },
    title: "404 Page",
  };
}

export default function NotFound() {
  return (
    <section className={styles["page"]}>
      <h1 className={styles["not-found-title"]}>
        <p className={styles["code"]}>404</p>
        <p className={styles["message"]}>Oops! page not found.</p>
      </h1>

      <p className={styles["description"]}>
        The page you're looking for seems to have wandered off into the unknown.
      </p>

      <picture className={styles["not-found-picture"]}>
        <source
          srcSet="/defaults/not-found-small.webp"
          media="(max-width: 430px)"
        />
        <source
          srcSet="/defaults/not-found-medium.webp"
          media="(max-width: 760px)"
        />
        <img
          src="/defaults/not-found.webp"
          alt="Not found picture"
          className={styles["not-found-img"]}
        />
      </picture>

      <Link href="/" className={styles["back-btn"]}>
        Return Home
      </Link>
    </section>
  );
}
