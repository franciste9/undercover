import { beforeEach } from "vitest";

// jsdom has no matchMedia, and the dashboard asks it for the system color scheme.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
