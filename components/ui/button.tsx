"use client";

import type { ButtonHTMLAttributes } from "react";

import { classNames } from "@components/helpers";

import styles from "./button.module.scss";
import {
  buttonPaddingClassNameMap,
  ButtonPaddingUnit,
  radiusClassNameMap,
  RadiusUnit,
  fontSizeClassNameMap,
  FontSizeUnit,
} from "@components/types";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "neutral"
  | "inverted"
  | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: FontSizeUnit;
  radius?: RadiusUnit;
  padding?: ButtonPaddingUnit;
  outlined?: boolean;
}

const variantClassNameMap: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  neutral: styles.buttonNeutral,
  inverted: styles.buttonInverted,
  ghost: styles.buttonGhost,
};

export function Button({
  className,
  size = "s",
  type = "button",
  variant = "neutral",
  radius = "s",
  padding = "m",
  outlined,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        styles.button,
        variantClassNameMap[variant],
        fontSizeClassNameMap[size],
        radiusClassNameMap[radius],
        buttonPaddingClassNameMap[padding],
        outlined !== undefined && styles.outlined,
        className,
      )}
      type={type}
      {...props}
    />
  );
}
