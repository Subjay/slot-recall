import { HTMLAttributes } from "react";
import styles from "./pill.module.scss";
import { classNames } from "@components/helpers";
import { paddingClassNameMap, IconUnit } from "@components/types";

interface PillProps extends HTMLAttributes<HTMLDivElement> {
  padding?: IconUnit;
}

export default function Pill({
  className,
  padding = "none",
  children,
  ...props
}: PillProps) {
  return (
    <div
      className={classNames(
        styles.container,
        paddingClassNameMap[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
