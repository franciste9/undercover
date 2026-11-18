import { ClaimPage } from "./ClaimPage";
import { Instructions } from "./Instructions";
import { Queue } from "./Queue";
import { useRoute } from "./route";

const CLAIMS = "/claims/";

function page(route: string) {
  if (route.startsWith(CLAIMS)) {
    const claimId = route.slice(CLAIMS.length);
    return <ClaimPage key={claimId} claimId={claimId} />;
  }
  if (route === "/instructions") return <Instructions />;
  return <Queue />;
}

export function App() {
  const route = useRoute();
  const onInstructions = route === "/instructions";

  return (
    <>
      <header>
        <div>
          <h1>UnderCover</h1>
          <p className="tagline">Travel insurance claims</p>
        </div>
        <nav>
          <a className={onInstructions ? "" : "on"} href="#/">
            Queue
          </a>
          <a className={onInstructions ? "on" : ""} href="#/instructions">
            Instructions
          </a>
        </nav>
      </header>
      <main>{page(route)}</main>
    </>
  );
}
