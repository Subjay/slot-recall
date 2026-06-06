import styles from "./floaty.module.scss";
import { HTMLAttributes } from "react";
import { classNames } from "@components/helpers";
import { PublicMedia } from "@dto/media/output";

interface FloatyImageProps extends HTMLAttributes<HTMLPictureElement> {
  picture: PublicMedia;
}

export default async function FloatyImage({
  picture,
  className,
  ...props
}: FloatyImageProps) {
  return (
    <picture className={classNames(styles["picture"], className)} {...props}>
      {picture.url.small ? (
        <source srcSet={picture.url.small} media="(max-width: 360px)" />
      ) : null}
      {picture.url.medium ? (
        <source srcSet={picture.url.medium} media="(max-width: 768px)" />
      ) : null}
      <img
        src={picture.url.full}
        alt={picture.alt ?? undefined}
        className={styles["img"]}
      />
    </picture>
  );
}
