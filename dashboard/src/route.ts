import { useEffect, useState } from "react";

function here(): string {
  return window.location.hash.slice(1) || "/";
}

export function useRoute(): string {
  const [route, setRoute] = useState(here);
  useEffect(() => {
    const update = () => {
      setRoute(here());
    };
    window.addEventListener("hashchange", update);
    return () => {
      window.removeEventListener("hashchange", update);
    };
  }, []);
  return route;
}
