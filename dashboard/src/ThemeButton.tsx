import { useTheme } from "./theme";

const RAYS = ["0", "45", "90", "135", "180", "225", "270", "315"];

function Sun() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      {RAYS.map((angle) => (
        <line
          key={angle}
          x1="8"
          y1="1.1"
          x2="8"
          y2="2.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          transform={`rotate(${angle} 8 8)`}
        />
      ))}
    </svg>
  );
}

function Moon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
      <path
        d="M13.3 9.8A5.6 5.6 0 0 1 6.2 2.7 6.1 6.1 0 1 0 13.3 9.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ThemeButton() {
  const { theme, toggle } = useTheme();
  const toDark = theme === "light";

  return (
    <button
      type="button"
      className="ghost"
      onClick={toggle}
      aria-label={toDark ? "Switch to dark mode" : "Switch to light mode"}
    >
      {toDark ? <Moon /> : <Sun />}
      {toDark ? "Dark" : "Light"}
    </button>
  );
}
