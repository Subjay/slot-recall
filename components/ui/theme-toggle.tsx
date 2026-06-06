"use client";

import { useEffect, useState } from "react";

import { classNames } from "@components/helpers";

import { Button, type ButtonProps } from "./button";
import styles from "./theme-toggle.module.scss";
import { iconSizeClassNameMap, IconUnit } from "@components/types";

type Theme = "light" | "dark";

const THEME_KEY = "theme-preference";

const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "dark";
  }

  const storedTheme = window.localStorage.getItem(THEME_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export interface ThemeToggleProps extends Omit<
  ButtonProps,
  "children" | "onClick"
> {
  size?: IconUnit;
}

export function ThemeToggle({
  className,
  size = "s",
  ...props
}: ThemeToggleProps) {
  const applyTheme = (theme: Theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
    setTheme(theme);
  };

  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const preferredTheme = getPreferredTheme();

    applyTheme(preferredTheme);
    setMounted(true);
  }, []);

  const nextTheme: Theme = theme === "light" ? "dark" : "light";
  const label = theme === "light" ? "dark theme" : "light theme";
  const icon = theme === "light" ? "☀" : "☾";

  return (
    <Button
      aria-label={`Switch to ${label.toLowerCase()}`}
      className={classNames(
        styles.themeToggle,
        iconSizeClassNameMap[size],
        className,
      )}
      onClick={() => {
        applyTheme(nextTheme);
      }}
      size={"s"}
      variant={"ghost"}
      radius="m"
      outlined
      {...props}
    >
      <span aria-hidden="true" className={classNames(styles.icon)}>
        {mounted ? icon : "◌"}
      </span>
    </Button>
  );
}
