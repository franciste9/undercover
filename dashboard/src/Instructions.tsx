import { useEffect, useState } from "react";
import { getInstructions } from "./api";

export function Instructions() {
  const [text, setText] = useState("");

  useEffect(() => {
    void getInstructions()
      .then((answer) => {
        setText(answer.text);
      })
      .catch(() => undefined);
  }, []);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>The agent&rsquo;s instructions</h2>
        <span className="count">Read only, from backend/instructions.md</span>
      </div>
      <pre className="instructions">{text}</pre>
    </section>
  );
}
