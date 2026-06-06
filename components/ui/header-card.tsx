import { HTMLAttributes } from "react";
import styles from "./header-card.module.scss";
import { classNames } from "@components/helpers";
import { PublicMedia } from "@dto/media/output";

interface HeaderCardProps extends HTMLAttributes<HTMLPictureElement> {
  picture: PublicMedia;
}

export default function HeaderCard({
  className,
  picture,
  ...props
}: HeaderCardProps) {
  const { url, alt } = picture;

  return (
    <picture className={classNames(styles.container, className)} {...props}>
      {url.small ? (
        <source srcSet={url.medium} media="(max-width: 360px)" />
      ) : null}
      {url.medium ? (
        <source srcSet={url.medium} media="(max-width: 768px)" />
      ) : null}
      <img src={url.full} alt={alt ?? undefined} className={styles.img} />
    </picture>
  );
}
