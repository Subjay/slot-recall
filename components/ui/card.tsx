import { HTMLAttributes } from "react";
import styles from "./card.module.scss";
import { classNames } from "@components/helpers";
import {
  paddingClassNameMap,
  PaddingUnit,
  radiusClassNameMap,
  RadiusUnit,
} from "@components/types";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  radius?: RadiusUnit;
  padding?: PaddingUnit;
}

export default function Card({
  className,
  radius = "xxl",
  padding = "none",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={classNames(
        styles.container,
        radiusClassNameMap[radius],
        paddingClassNameMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
