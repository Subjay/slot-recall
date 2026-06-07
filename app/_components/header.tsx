"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/insights", label: "Insights" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="flex items-center gap-4 bg-[#1a1a1a] px-[10%] py-4 text-white">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-full border-[3px] border-current"
        />

        <h1 className="text-lg font-semibold">Appointment Manager</h1>
      </div>

      <nav
        aria-label="Primary navigation"
        className="ml-auto flex items-center gap-1 overflow-x-auto rounded-full bg-neutral-800 p-[3px]"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "relative flex min-h-[34px] items-center whitespace-nowrap rounded-full px-3.5 text-sm leading-none transition-[background-color,color,transform] duration-200 after:absolute after:right-3.5 after:bottom-[7px] after:left-3.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:opacity-0 after:transition-[transform,opacity] after:duration-200 hover:after:scale-x-100 hover:after:opacity-45 focus-visible:after:scale-x-100 focus-visible:after:opacity-45 active:scale-[0.985]",
                isActive
                  ? "bg-white text-black after:opacity-0"
                  : "bg-transparent text-white",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
