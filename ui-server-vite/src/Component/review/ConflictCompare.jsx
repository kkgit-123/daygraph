export default function ConflictCompare({ conflict, earlierDate }) {
  const { earlier, proposed, rationale } = conflict;
  return (
    <div className="border border-[#F0B8AB] rounded-xl bg-[#FEF7F5] px-[22px] py-5 flex flex-col gap-4">
      <div className="font-bold text-[15px] text-conflict-ink">Same topic, different date</div>
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex-[1_1_200px] px-[18px] py-4 rounded-[10px] bg-white border border-border">
          <div className="text-muted text-[13px]">Earlier decision{earlierDate ? `, ${earlierDate}` : ''}</div>
          <div className="text-[30px] font-bold tracking-[-0.02em] mt-1 text-muted">{earlier?.value}</div>
          {earlier?.quote && <div className="font-serif text-[17px] leading-[1.55] mt-2">{earlier.quote}</div>}
          {earlier?.meta && <div className="text-muted text-[13px] mt-2">{earlier.meta}</div>}
        </div>
        <div className="shrink-0 flex flex-col items-center justify-center gap-1 text-conflict-ink min-w-[92px]">
          <svg width="34" height="20" viewBox="0 0 34 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 10h28M24 3l7 7-7 7" />
          </svg>
          <span className="font-bold text-[13px]">{proposed?.deltaLabel}</span>
        </div>
        <div className="flex-[1_1_200px] px-[18px] py-4 rounded-[10px] bg-white border-2 border-conflict">
          <div className="text-[13px] text-conflict-ink font-semibold">This decision, today</div>
          <div className="text-[30px] font-bold tracking-[-0.02em] mt-1">{proposed?.value}</div>
        </div>
      </div>
      {rationale && (
        <div className="flex gap-2.5 items-start text-[14px] leading-normal">
          <span className="mt-0.5 text-accent shrink-0"><SparkIcon /></span>
          <span>{rationale}</span>
        </div>
      )}
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    </svg>
  );
}
