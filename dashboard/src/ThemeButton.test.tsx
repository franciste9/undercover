import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ThemeButton } from "./ThemeButton";

afterEach(cleanup);

function button(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

it("switches the page to dark and back", () => {
  render(<ThemeButton />);
  expect(document.documentElement.dataset.theme).toBeUndefined();

  fireEvent.click(button("Switch to dark mode"));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("undercover-theme")).toBe("dark");

  fireEvent.click(button("Switch to light mode"));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(screen.getByText("Dark")).toBeDefined();
});

it("keeps the choice made last time", () => {
  localStorage.setItem("undercover-theme", "dark");
  render(<ThemeButton />);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(button("Switch to light mode")).toBeDefined();
});

it("follows the system when nobody has chosen", () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
  render(<ThemeButton />);
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(button("Switch to light mode")).toBeDefined();
});
