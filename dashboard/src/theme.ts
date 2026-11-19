import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const KEY = "undercover-theme";
const DARK = "(prefers-color-scheme: dark)";

function chosen(): Theme | null {
  const stored = localStorage.getItem(KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

function system(): Theme {
  return window.matchMedia(DARK).matches ? "dark" : "light";
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [choice, setChoice] = useState<Theme | null>(chosen);
  const [theirs, setTheirs] = useState<Theme>(system);

  useEffect(() => {
    const query = window.matchMedia(DARK);
    const follow = () => {
      setTheirs(query.matches ? "dark" : "light");
    };
    query.addEventListener("change", follow);
    return () => {
      query.removeEventListener("change", follow);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (choice === null) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", choice);
  }, [choice]);

  const theme = choice ?? theirs;

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    setChoice(next);
  };

  return { theme, toggle };
}
