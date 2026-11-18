import { Queue } from "./Queue";

export function App() {
  return (
    <>
      <header>
        <div>
          <h1>UnderCover</h1>
          <p className="tagline">Travel insurance claims</p>
        </div>
      </header>
      <main>
        <Queue />
      </main>
    </>
  );
}
