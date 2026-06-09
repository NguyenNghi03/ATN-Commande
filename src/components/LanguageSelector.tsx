import { Globe } from 'lucide-react';
import { DEFAULT_LANG, LANGUAGES, type AppLang } from '../data/languages';

type LanguageSelectorProps = {
  value?: AppLang;
  onChange: (lang: AppLang) => void;
};

export function LanguageSelector({ value = DEFAULT_LANG, onChange }: LanguageSelectorProps) {
  return (
    <label className="relative flex cursor-pointer items-center gap-1.5 rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-500">
      <Globe size={14} strokeWidth={2} className="shrink-0 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AppLang)}
        className="cursor-pointer appearance-none border-none bg-transparent pr-4 font-[inherit] text-[13px] font-semibold text-slate-600 outline-none"
        aria-label="Choisir la langue"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.label}
          </option>
        ))}
      </select>
      <ChevronDown />
    </label>
  );
}

function ChevronDown() {
  return (
    <svg
      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
