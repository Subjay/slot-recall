"use client";

import type { HTMLAttributes } from "react";

import { classNames } from "@components/helpers";

import styles from "./separator.module.scss";

type SeparatorOrientation = "horizontal" | "vertical";

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: SeparatorOrientation;
}

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorProps) {
  return (
    <div
      aria-orientation={orientation}
      className={classNames(
        styles.separator,
        orientation === "horizontal"
          ? styles.separatorHorizontal
          : styles.separatorVertical,
        className,
      )}
      role="separator"
      {...props}
    />
  );
}
