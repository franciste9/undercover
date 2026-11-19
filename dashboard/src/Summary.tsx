import type { QueueClaim, Stage } from "./api";
import { money, STAGE_ORDER, STAGES } from "./format";

export function Summary({ claims }: Readonly<{ claims: QueueClaim[] }>) {
  const inStage = (stage: Stage) =>
    claims.filter((claim) => claim.stage === stage);

  return (
    <section className="summary" aria-label="The queue by stage">
      {STAGE_ORDER.map((stage) => {
        const here = inStage(stage);
        const claimed = here.reduce(
          (total, claim) => total + claim.amount_claimed,
          0,
        );
        return (
          <div className="panel tile" key={stage}>
            <span className={`chip ${stage}`}>{STAGES[stage]}</span>
            <p className="figure">{here.length}</p>
            <p className="note">{money(claimed)} claimed</p>
          </div>
        );
      })}
    </section>
  );
}
