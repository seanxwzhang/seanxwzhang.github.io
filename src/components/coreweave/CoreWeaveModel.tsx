import { useEffect, useMemo, useRef, useState } from 'react';
import { C, DEFAULTS, evaluate, perShareAt, type Inputs } from './model';

type Key = keyof Inputs;
interface Knob {
  key: Key; question: string; min: number; max: number; step: number;
  fmt: (v: number) => string; mark?: { value: number; label: string };
}

const pct = (v: number) => `${(v * 100).toFixed(v * 100 % 1 === 0 ? 0 : 1)}%`;
const KNOBS: Knob[] = [
  { key: 'rent', question: 'How much will new contracts pay per chip-hour?', min: 2, max: 6, step: 0.01,
    fmt: (v) => `$${v.toFixed(2)}`, mark: { value: C.signedRent, label: "Today's big contracts" } },
  { key: 'decline', question: 'How much less will an older chip rent for, each year?', min: 0, max: 0.2, step: 0.005,
    fmt: pct, mark: { value: 0.06, label: 'A100 history' } },
  { key: 'life', question: 'How many years will a chip stay useful?', min: 5, max: 10, step: 0.5,
    fmt: (v) => `${v} yrs`, mark: { value: 6, label: "CoreWeave's accounting" } },
  { key: 'delay', question: 'How long until sold chips are switched on?', min: 0.5, max: 4, step: 0.25,
    fmt: (v) => `${v} yrs`, mark: { value: 1.5, label: 'Management target' } },
  { key: 'rate', question: 'What does CoreWeave pay for money each year?', min: 0.07, max: 0.15, step: 0.0025,
    fmt: pct, mark: { value: 0.15, label: 'Its bonds today' } },
];

const money = (v: number, d = 2) => `${v < 0 ? '−' : ''}$${Math.abs(v).toFixed(d)}`;
const bn = (v: number) => `${v < 0 ? '−' : '+'}$${Math.abs(v).toFixed(1)}B`;

function MarkLabel({ pos, text }: { pos: number; text: string }) {
  // keep the label inside the track: left-align near the left end, right-align near the right end
  const align = pos < 25 ? 'left' : pos > 75 ? 'right' : 'center';
  const shift = align === 'left' ? '0%' : align === 'right' ? '-100%' : '-50%';
  return (
    <div className="absolute top-6 text-[13px] text-ink-muted whitespace-nowrap pointer-events-none"
      style={{ left: `${pos}%`, transform: `translateX(${shift})`, textAlign: align }}>
      <span className="block h-1.5 w-px bg-ink-muted mb-0.5"
        style={{ marginLeft: align === 'left' ? 0 : align === 'right' ? 'auto' : 'auto', marginRight: align === 'right' ? 0 : align === 'left' ? 'auto' : 'auto' }} />
      {text}
    </div>
  );
}

function useWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function Slider({ k, value, onChange }: { k: Knob; value: number; onChange: (v: number) => void }) {
  const pos = (v: number) => ((v - k.min) / (k.max - k.min)) * 100;
  return (
    <div className="py-4 border-b border-cream-300 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={`cw-${k.key}`} className="text-[15px] leading-snug text-ink-light">{k.question}</label>
        <span className="font-serif text-2xl text-ink tabular-nums whitespace-nowrap">{k.fmt(value)}</span>
      </div>
      <div className="relative mt-3 pb-5">
        <input id={`cw-${k.key}`} type="range" min={k.min} max={k.max} step={k.step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full accent-coral cursor-pointer" aria-valuetext={k.fmt(value)} />
        {k.mark && (
          <MarkLabel pos={pos(k.mark.value)} text={`${k.mark.label} ${k.fmt(k.mark.value)}`} />
        )}
      </div>
    </div>
  );
}

function Chart({ x, implied }: { x: Inputs; implied: number | null }) {
  const [ref, W] = useWidth<HTMLElement>(640);
  const H = Math.round(Math.min(340, Math.max(240, W * 0.45))), L = 52, R = 16, T = 16, B = 44;
  const xs = Array.from({ length: 81 }, (_, i) => 2 + (i * 4) / 80);
  const ys = xs.map((p) => perShareAt(p, x));
  const yMin = Math.min(-40, Math.floor(Math.min(...ys) / 20) * 20);
  // cap the y-axis so the interesting range (around today's price) stays readable; the line is clipped above
  const yMax = Math.min(160, Math.max(120, Math.ceil(Math.max(...ys, C.price) / 20) * 20));
  const sx = (p: number) => L + ((p - 2) / 4) * (W - L - R);
  const sy = (v: number) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const path = xs.map((p, i) => `${i ? 'L' : 'M'}${sx(p).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join('');
  const step = (yMax - yMin) / 4 > 40 ? 50 : 20;
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) yTicks.push(v);
  const cur = perShareAt(x.rent, x);
  return (
    <figure className="mt-10" ref={ref}>
      <figcaption className="font-serif text-xl text-ink mb-1">What one share is worth at different rents</figcaption>
      <p className="text-[15px] text-ink-light mb-3">Everything else as set above. The dashed line is today's price; where the curve crosses it is the rent the market is betting on.</p>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img"
        aria-label="Line chart of value per share against rent per chip-hour">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? '#718096' : '#EBE8E2'} strokeWidth={v === 0 ? 1 : 1} />
            <text x={L - 8} y={sy(v) + 4} textAnchor="end" fontSize="13" fill="#718096">{money(v, 0)}</text>
          </g>
        ))}
        {[2, 3, 4, 5, 6].map((p) => (
          <text key={p} x={sx(p)} y={H - B + 20} textAnchor="middle" fontSize="13" fill="#718096">${p}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="13" fill="#718096">Rent on new contracts, per chip-hour</text>
        <line x1={L} x2={W - R} y1={sy(C.price)} y2={sy(C.price)} stroke="#2D3748" strokeDasharray="4 4" />
        <text x={L + 6} y={sy(C.price) - 6} fontSize="13" fill="#2D3748">Today's price ${C.price.toFixed(2)}</text>
        <defs><clipPath id="cw-plot"><rect x={L} y={T} width={W - L - R} height={H - T - B} /></clipPath></defs>
        <path d={path} fill="none" stroke="#E07A5F" strokeWidth="2.5" clipPath="url(#cw-plot)" />
        {implied !== null && implied >= 2 && implied <= 6 && (
          <g>
            <circle cx={sx(implied)} cy={sy(C.price)} r="4.5" fill="#2D3748" />
            <text x={sx(implied) + 8} y={sy(C.price) + 18} fontSize="13" fill="#2D3748">Market's bet ${implied.toFixed(2)}</text>
          </g>
        )}
        {x.rent >= 2 && x.rent <= 6 && cur <= yMax && <circle cx={sx(x.rent)} cy={sy(cur)} r="5" fill="#E07A5F" stroke="#fff" strokeWidth="2" />}
      </svg>
    </figure>
  );
}

function Bars({ r }: { r: ReturnType<typeof evaluate> }) {
  const rows = [
    { label: 'Chips running today', v: r.running },
    { label: 'Chips sold, not yet built', v: r.sold },
    { label: 'Already spent on those chips', v: r.spent },
    { label: 'Future chips, not yet sold', v: r.future },
    { label: 'Owed to lenders and customers', v: r.owed },
  ];
  const max = Math.max(...rows.map((x) => Math.abs(x.v)), Math.abs(r.equity));
  const w = (v: number) => `${(Math.abs(v) / max) * 100}%`;
  return (
    <div className="mt-8">
      <h4 className="font-serif text-xl text-ink mb-3">Where the value comes from</h4>
      <div className="space-y-3">
        {[...rows, { label: 'Left for shareholders', v: r.equity, total: true }].map((x: any) => (
          <div key={x.label} className={x.total ? 'pt-3 border-t border-cream-300' : ''}>
            <div className="flex items-baseline justify-between gap-3">
              <span className={`text-[15px] leading-tight ${x.total ? 'text-ink font-medium' : 'text-ink-light'}`}>{x.label}</span>
              <span className={`tabular-nums text-[15px] ${x.v < 0 ? 'text-coral-dark' : 'text-ink'} ${x.total ? 'font-medium' : ''}`}>{bn(x.v)}</span>
            </div>
            <div className="mt-1 h-2.5 rounded-sm" style={{ width: w(x.v), background: x.total ? '#2D3748' : x.v < 0 ? '#E07A5F' : '#D4D1C9' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CoreWeaveModel() {
  const [x, setX] = useState<Inputs>(DEFAULTS);
  const r = useMemo(() => evaluate(x), [x]);
  const set = (k: Key) => (v: number) => setX((s) => ({ ...s, [k]: v }));
  const worthless = r.perShare <= 0;
  return (
    <div className="not-prose my-10 rounded-xl border border-cream-300 bg-cream-50 p-5 sm:p-7">
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
        <div>
          {KNOBS.map((k) => <Slider key={k.key} k={k} value={x[k.key]} onChange={set(k.key)} />)}
          <button type="button" onClick={() => setX(DEFAULTS)}
            className="mt-3 text-[15px] text-coral underline decoration-coral/30 hover:decoration-coral">
            Reset to my assumptions
          </button>
        </div>
        <div>
          <div className="border-t-2 border-ink pt-4">
            {worthless ? (
              <p className="font-serif text-[1.65rem] leading-snug text-ink">
                With these numbers, a CoreWeave share is worth <span className="text-coral font-semibold">nothing</span>.
                What it owes exceeds what its chips will earn by {money(-r.equity, 1)} billion.
              </p>
            ) : (
              <p className="font-serif text-[1.65rem] leading-snug text-ink">
                With these numbers, one CoreWeave share is worth about{' '}
                <span className={`font-semibold ${r.upside < 0 ? 'text-coral' : 'text-ink'}`}>{money(r.perShare)}</span>,{' '}
                {Math.abs(r.upside * 100).toFixed(0)}% {r.upside < 0 ? 'below' : 'above'} today's ${C.price.toFixed(2)}.
              </p>
            )}
            <p className="mt-3 text-[15px] text-ink-light">
              A new chip breaks even at {money(r.breakeven)} an hour. For the stock to be worth ${C.price.toFixed(2)},
              new contracts need {r.implied === null ? 'more than $15' : money(r.implied)} an hour.
            </p>
          </div>
          <Bars r={r} />
        </div>
      </div>
      <Chart x={x} implied={r.implied} />
      <p className="mt-6 text-[13px] text-ink-muted">
        Share price as of Oct 16, 2026. A simplified model of a complicated company; not investment advice.
      </p>
    </div>
  );
}
