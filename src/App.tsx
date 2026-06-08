import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  User,
  Building2,
  Calendar,
  Clock,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  Minus,
  Send,
  Copy,
  RotateCcw,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { OrderedProductsTable } from './components/OrderedProductsTable';
import { Card, SectionLabel } from './components/ui';
import { useOrderState } from './hooks/useOrderState';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import type { ActionLogEntry } from './types/order';

const metaFields = [
  { icon: User,          label: 'Client',            value: 'Resto Martin',         bg: '/img/card001.png' },
  { icon: Building2,     label: 'Site',              value: 'Entrepôt Sud',         bg: '/img/card002.png' },
  { icon: Calendar,      label: 'Date de Livraison', value: 'Jeudi 05/06/2026',     bg: '/img/card003.png' },
  { icon: Clock,         label: 'Créneau',           value: 'Matin (avant 10h)',    bg: '/img/card004.png' },
  { icon: MessageSquare, label: 'Commentaire',       value: 'Laisser au quai B',    bg: '/img/card005.png' },
];

function HeaderDotPattern() {
  const dots: { cx: number; cy: number; r: number; fill: string }[] = [
    { cx: 500, cy: 26, r: 9,  fill: 'rgba(255,255,255,0.07)' },
    { cx: 580, cy: 12, r: 5,  fill: 'rgba(186,230,253,0.14)' },
    { cx: 640, cy: 40, r: 7,  fill: 'rgba(255,255,255,0.09)' },
    { cx: 710, cy: 18, r: 11, fill: 'rgba(133,183,235,0.12)' },
    { cx: 770, cy: 38, r: 6,  fill: 'rgba(186,230,253,0.16)' },
    { cx: 840, cy: 10, r: 8,  fill: 'rgba(255,255,255,0.08)' },
    { cx: 900, cy: 32, r: 13, fill: 'rgba(56,189,248,0.1)' },
    { cx: 960, cy: 14, r: 5,  fill: 'rgba(255,255,255,0.11)' },
    { cx: 1020, cy: 42, r: 10, fill: 'rgba(186,230,253,0.13)' },
    { cx: 1080, cy: 20, r: 7,  fill: 'rgba(255,255,255,0.09)' },
    { cx: 1140, cy: 36, r: 12, fill: 'rgba(133,183,235,0.11)' },
    { cx: 1188, cy: 12, r: 6,  fill: 'rgba(186,230,253,0.15)' },
    { cx: 548, cy: 44, r: 4,  fill: 'rgba(255,255,255,0.06)' },
    { cx: 820, cy: 44, r: 4,  fill: 'rgba(56,189,248,0.08)' },
    { cx: 1048, cy: 8,  r: 4,  fill: 'rgba(255,255,255,0.08)' },
    { cx: 1120, cy: 48, r: 5,  fill: 'rgba(186,230,253,0.1)' },
  ];

  return (
    <svg className="app-header__pattern" viewBox="0 0 1200 52" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="header-dot-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0C447C" stopOpacity="0" />
          <stop offset="40%" stopColor="#0C447C" stopOpacity="0" />
          <stop offset="72%" stopColor="#1565a8" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#85B7EB" stopOpacity="0.1" />
        </linearGradient>
        <mask id="header-dot-mask">
          <linearGradient id="header-dot-mask-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="black" />
            <stop offset="32%" stopColor="black" />
            <stop offset="58%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" />
          </linearGradient>
          <rect width="1200" height="52" fill="url(#header-dot-mask-grad)" />
        </mask>
        <radialGradient id="header-dot-glow" cx="88%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#85B7EB" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0C447C" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="1200" height="52" fill="url(#header-dot-fade)" />
      <rect width="1200" height="52" fill="url(#header-dot-glow)" />

      <g mask="url(#header-dot-mask)">
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} />
        ))}
      </g>
    </svg>
  );
}

function LogoIcon() {
  const bars = [10, 18, 14, 22, 12];
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={3 + i * 4}
          y={(22 - h) / 2}
          width="2.5"
          height={h}
          rx="1.25"
          fill="#fff"
        />
      ))}
    </svg>
  );
}

const WAVE_BARS = 50;

type WaveBar = { height: number; opacity: number; delay: number; duration: number };

function buildFullWaveBars(count: number, maxH: number, minH: number): WaveBar[] {
  const center = (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => {
    const dist = Math.abs(i - center) / center;
    const envelope = Math.pow(1 - dist, 1.65);
    const distFromCenter = Math.abs(i - center);
    return {
      height: Math.round(minH + (maxH - minH) * envelope),
      opacity: 0.18 + 0.82 * envelope,
      delay: distFromCenter * 0.055 + i * 0.018,
      duration: 2.15 + (distFromCenter % 5) * 0.07 + (i % 3) * 0.04,
    };
  });
}

const fullWaveBars = buildFullWaveBars(WAVE_BARS, 52, 4);

function VoiceWaveFull() {
  return (
    <div className="voice-wave-full" aria-hidden>
      {fullWaveBars.map((bar, i) => (
        <div
          key={i}
          className="voice-wave-bar"
          style={{
            height: bar.height,
            opacity: bar.opacity,
            ['--bar-delay' as string]: `${bar.delay.toFixed(3)}s`,
            ['--bar-duration' as string]: `${bar.duration.toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}

function VoiceAssistantCard({ onTranscript }: { onTranscript: (text: string) => void }) {
  const micSize = 64;
  const { isListening, displayText, fullText, start, stop, isSupported } =
    useSpeechRecognition(onTranscript);

  const toggleRecording = () => {
    if (isListening) stop();
    else start();
  };

  return (
    <div className="voice-card w-full">
      <div className="voice-card__body">
        <div className={`voice-mic-row${isListening ? ' voice-mic-row--recording' : ''}`}>
          <VoiceWaveFull />
          <div
            className={`voice-mic-stack${isListening ? ' voice-mic-stack--recording' : ''}`}
            style={{ width: micSize + 40, height: micSize + 40 }}
          >
            <div className="voice-mic-glow" style={{ width: micSize + 36, height: micSize + 36 }} />
            <div className="mic-halo voice-mic-halo" style={{ width: micSize + 14, height: micSize + 14 }} />
            <div className="mic-halo voice-mic-halo mic-halo-2" style={{ width: micSize + 14, height: micSize + 14 }} />
            <div className="voice-mic-ring" style={{ width: micSize + 8, height: micSize + 8 }} />
            <button
              type="button"
              onClick={() => void toggleRecording()}
              className={`voice-mic-btn${isListening ? ' voice-mic-btn--recording' : ''}`}
              style={{ width: micSize, height: micSize }}
              aria-label={isListening ? 'Dừng ghi âm' : 'Bắt đầu ghi âm tiếng Việt'}
              aria-pressed={isListening}
            >
              <Mic size={28} color="#fff" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="voice-card__text">
          <p
            className={`voice-card__title${
              displayText ? ' voice-card__title--live' : isListening ? ' voice-card__title--recording' : ''
            }`}
            title={displayText ? fullText : undefined}
          >
            {displayText || (isListening ? '…' : 'Nói ngay bây giờ…')}
          </p>
          <p className={`voice-card__subtitle${isListening ? ' voice-card__subtitle--recording' : ''}`}>
            {isListening
              ? 'Bấm lại để dừng'
              : !isSupported
                ? 'Trình duyệt không hỗ trợ nhận giọng nói'
                : 'Mic tiếng Việt — đang nghe lệnh của bạn'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ActionTimelineDot({ type }: { type: ActionLogEntry['type'] }) {
  if (type === 'add') {
    return (
      <div className="actions-timeline__dot actions-timeline__dot--add">
        <CheckCircle2 size={12} color="#16a34a" strokeWidth={2.5} />
      </div>
    );
  }
  if (type === 'correct') {
    return (
      <div className="actions-timeline__dot actions-timeline__dot--correct">
        <RefreshCw size={11} color="#2563eb" strokeWidth={2.5} />
      </div>
    );
  }
  if (type === 'remove') {
    return (
      <div className="actions-timeline__dot actions-timeline__dot--ignore">
        <Trash2 size={11} color="#dc2626" strokeWidth={2.5} />
      </div>
    );
  }
  return (
    <div className="actions-timeline__dot actions-timeline__dot--ignore">
      <Minus size={11} color="#94a3b8" strokeWidth={2.5} />
    </div>
  );
}

function ActionLabel({ entry }: { entry: ActionLogEntry }) {
  return (
    <span
      className={`actions-timeline__label${
        entry.isLatest ? ' actions-timeline__label--latest' : ''
      }`}
    >
      {entry.type === 'ignore' && (
        <span className="actions-timeline__badge">Ignoré</span>
      )}
      {entry.product ? (
        <>
          <strong className="actions-timeline__product">{entry.product}</strong>
          {entry.label}
        </>
      ) : (
        entry.label
      )}
    </span>
  );
}

function ActionsPanel({ entries }: { entries: ActionLogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries]);

  return (
    <Card className="actions-panel">
      <div className="actions-panel__header">
        <SectionLabel compact>Actions Détectées</SectionLabel>
      </div>
      <div className="actions-timeline__scroll">
        <div className="actions-timeline__list">
          {entries.map((entry, i) => (
            <div
              key={i}
              className={`actions-timeline__item${entry.isLatest ? ' actions-timeline__item--latest' : ''}`}
            >
              <div className="actions-timeline__track">
                <ActionTimelineDot type={entry.type} />
              </div>
              <div className="actions-timeline__body">
                <ActionLabel entry={entry} />
                <span className="actions-timeline__time">
                  <Clock size={11} strokeWidth={2} className="shrink-0 text-slate-400" />
                  {entry.time}
                </span>
              </div>
            </div>
          ))}
          <div ref={endRef} className="actions-timeline__anchor" aria-hidden />
        </div>
      </div>
    </Card>
  );
}

function MetaFieldCard({ icon: Icon, label, value, bg }: {
  icon: typeof User;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <div className="meta-field-card" style={{ backgroundImage: `url(${bg})` }}>
      <div className="meta-field-card__overlay">
        <div className="mb-1 flex items-center gap-1.5">
          <Icon size={12} color="#64748b" strokeWidth={2} />
          <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </span>
        </div>
        <p className="m-0 truncate text-[12.5px] font-bold leading-tight text-blue-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function TextInputCard({ onSubmit }: { onSubmit: (text: string) => boolean }) {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const ok = onSubmit(trimmed);
    if (ok) {
      setText('');
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <Card className="text-input-card w-full">
      <SectionLabel compact>Saisie Texte (Alternative)</SectionLabel>
      <div className="relative mt-2">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ex. Tomates ajoutées — 200 kg · add 300 kg carrots · thêm 150 cagette rau xà lách"
          className={`w-full resize-none overflow-y-auto rounded-[10px] border bg-slate-50 px-3.5 py-2.5 font-[inherit] text-[13px] leading-snug text-slate-700 outline-none ${
            error ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
          }`}
        />
        <button
          type="button"
          onClick={submit}
          className="absolute bottom-2 right-1.5 flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg border-none bg-blue-600 transition-opacity hover:opacity-90"
          aria-label="Envoyer la commande"
        >
          <Send size={14} color="#fff" strokeWidth={2} />
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-[11px] text-red-500">
          Commande non reconnue — essayez&nbsp;: «&nbsp;Tomates ajoutées — 200 kg&nbsp;»
        </p>
      )}
    </Card>
  );
}

export default function App() {
  const [jsonOpen, setJsonOpen] = useState(false);
  const { rows, actionLog, handleMessage, setQty, removeRow, reset } = useOrderState();

  const orderJson = JSON.stringify(
    {
      client: 'Resto Martin',
      site: 'Entrepôt Sud',
      livraison: '2026-06-05',
      creneau: 'matin',
      commentaire: 'Laisser au quai B',
      lignes: rows.map((r) => ({
        produit: r.produit,
        qte: r.qte,
        unite: r.unite,
        categorie: r.categorie,
      })),
      source: 'voix',
      ref: 'BC-2026-00142',
    },
    null,
    2,
  );

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#eef1f6]">

      {/* ── HEADER ── */}
      <div className="shrink-0 px-4 pt-2">
        <header className="app-header">
          <HeaderDotPattern />
          <div className="app-header__content">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700">
                <LogoIcon />
              </div>
              <div>
                <div className="text-[17px] font-semibold leading-tight tracking-tight text-white">
                  ATN — Commande Vocale
                </div>
                <div className="mt-px text-xs text-brand-sky">
                  Grossiste fruits &amp; légumes
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 text-[13px]">
              <span className="font-semibold text-brand-gold">Client&nbsp;:</span>
              <span className="font-semibold text-white">Resto Martin</span>

              <span className="mx-0.5 text-brand-gold/45">·</span>

              <span className="font-semibold text-brand-gold">Livraison&nbsp;:</span>
              <span className="font-medium text-white">Jeudi 05/06/2026</span>

              <span className="mx-0.5 text-brand-sky">·</span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3 py-1 text-[11px] font-semibold tracking-wide text-brand-gold-text">
                <Pencil size={12} color="#412402" strokeWidth={2.5} />
                Brouillon
              </span>
            </div>
          </div>
        </header>
      </div>

      <main className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-hidden px-4 pb-2.5 pt-2">

        {/* ── TOP ZONE ── */}
        <div className="flex shrink-0 flex-col gap-2">
          <div className="flex w-full flex-col gap-2">
            <div className="grid h-[192px] shrink-0 grid-cols-[20%_1fr] items-stretch gap-2 overflow-hidden [&>*]:h-full [&>*]:max-h-full [&>*]:min-h-0">
              <VoiceAssistantCard onTranscript={handleMessage} />
              <ActionsPanel entries={actionLog} />
            </div>
            <TextInputCard onSubmit={handleMessage} />
          </div>

          <div className="grid h-[100px] w-full shrink-0 grid-cols-5 gap-2.5">
            {metaFields.map((field) => (
              <MetaFieldCard
                key={field.label}
                icon={field.icon}
                label={field.label}
                value={field.value}
                bg={field.bg}
              />
            ))}
          </div>
        </div>

        {/* ── PRODUCTS + FOOTER ── */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">

          <OrderedProductsTable rows={rows} onQtyChange={setQty} onRemove={removeRow} />

          {/* ── FOOTER ACTIONS ── */}
          <div className="flex w-full shrink-0 items-center justify-between">
            <div className="flex gap-2.5">
              <button className="flex cursor-default items-center gap-2 rounded-[10px] border-none bg-gradient-to-br from-blue-500 to-blue-600 px-6 py-[11px] text-sm font-semibold text-white shadow-btn-primary">
                <Check size={16} strokeWidth={2.5} />
                Valider la commande
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-blue-600 bg-white px-6 py-[11px] text-sm font-semibold text-blue-600"
              >
                <RotateCcw size={15} strokeWidth={2} />
                Réinitialiser
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setJsonOpen((v) => !v)}
                className="flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-500"
              >
                <span className="font-mono text-[13px] font-semibold">{'{ }'}</span>
                <span>JSON</span>
                {jsonOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <div className="flex items-center gap-2 rounded-[10px] bg-brand-gold px-3.5 py-2.5">
                <span className="text-[13px] font-semibold tracking-wide text-white">
                  BC-2026-00142
                </span>
                <button
                  className="flex cursor-default border-none bg-transparent p-0.5 text-white transition-opacity hover:opacity-80"
                  aria-label="Copier la référence"
                >
                  <Copy size={14} color="#fff" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {jsonOpen && (
            <div className="max-h-[90px] shrink-0 overflow-auto rounded-[10px] bg-slate-800 px-3.5 py-2.5">
              <pre className="m-0 font-mono text-[11px] leading-normal text-slate-200">
                {orderJson}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
