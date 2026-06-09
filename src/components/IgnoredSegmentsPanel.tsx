import { Card, SectionLabel } from './ui';

type IgnoredSegmentsPanelProps = {
  segments: string[];
};

/** Segments ignorés / bruit (P2-TASK-004). */
export function IgnoredSegmentsPanel({ segments }: IgnoredSegmentsPanelProps) {
  if (segments.length === 0) return null;

  return (
    <Card className="ignored-panel w-full p-3">
      <SectionLabel compact>Segments ignorés</SectionLabel>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
        {segments.map((seg, i) => (
          <li
            key={`${i}-${seg.slice(0, 24)}`}
            className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] italic text-slate-500"
          >
            «&nbsp;{seg}&nbsp;»
          </li>
        ))}
      </ul>
    </Card>
  );
}
