"use client";

import { HTMLAttributes, useEffect } from "react";
import styles from "./modal.module.scss";
import { classNames } from "@components/helpers";
import { PaddingUnit, radiusClassNameMap, RadiusUnit } from "@components/types";
import { Button } from "./button";
import { CloseIcon } from "./icons";

export type ModalVariant = "fill" | "content" | "horizontal" | "vertical";

const variantClassNameMap: Record<ModalVariant, string> = {
  content: styles["content-size"],
  fill: styles["full-size"],
  horizontal: styles["horizontal-size"],
  vertical: styles["vertical-size"],
};

const marginClassNameMap: Record<PaddingUnit, string | undefined> = {
  none: undefined,
  xs: styles["margin-xs"],
  s: styles["margin-s"],
  m: styles["margin-m"],
  l: styles["margin-l"],
  xl: styles["margin-xl"],
};

const paddingClassNameMap: Record<PaddingUnit, string | undefined> = {
  none: undefined,
  xs: styles["padding-xs"],
  s: styles["padding-s"],
  m: styles["padding-m"],
  l: styles["padding-l"],
  xl: styles["padding-xl"],
};

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  variantSize?: ModalVariant;
  margin?: PaddingUnit;
  padding?: PaddingUnit;
  radius?: RadiusUnit;
  closeModal: () => void;
}

export default function Modal({
  children,
  className,
  variantSize = "content",
  margin = "none",
  padding = "m",
  radius = "l",
  closeModal,
  ...props
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal]);

  return (
    <section className={styles["container"]}>
      <div
        className={classNames(
          styles["fixed-window-modal"],
          variantClassNameMap[variantSize],
          radiusClassNameMap[radius],
        )}
        {...props}
      >
        <Button
          padding="none"
          className={styles["close-btn"]}
          radius="m"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
          }}
        >
          <CloseIcon padding="xs" size="s" />
        </Button>

        <div
          className={classNames(
            styles["scroll-window"],
            marginClassNameMap[margin],
            paddingClassNameMap[padding],
            className,
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
