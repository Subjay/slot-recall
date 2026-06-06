export const classNames = (
  ...values: Array<string | false | null | undefined>
) => {
  return values.filter(Boolean).join(" ");
};

export const isActiveLink = (pathname: string, href: string) => {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

import styles from "./shared.module.scss";

export function renderErrorMsg(
  messages?: string | Record<string, string[] | undefined>,
) {
  if (typeof messages === "string") return messages;

  return messages
    ? Object.entries(messages).flatMap(
        ([field, fieldMessages]) =>
          fieldMessages?.map((message, index) => (
            <p className={styles["error-message"]} key={`${field}-${index}`}>
              <span className={styles["error-span"]}>{field} :</span> {message}
            </p>
          )) ?? [],
      )
    : null;
}
