import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DEFAULT_LANG,
  getLanguage,
  VISIBLE_LANGUAGES,
  type AppLang,
} from '../data/languages';
import { FlagAvatar } from './FlagAvatar';

type LanguageSelectorProps = {
  value?: AppLang;
  onChange: (lang: AppLang) => void;
};

export function LanguageSelector({ value = DEFAULT_LANG, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const safeValue = VISIBLE_LANGUAGES.some((l) => l.id === value) ? value : DEFAULT_LANG;
  const current = getLanguage(safeValue);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const select = (lang: AppLang) => {
    onChange(lang);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <ul
          role="listbox"
          aria-label="Choisir la langue"
          className="absolute bottom-full left-0 z-50 mb-1.5 min-w-full overflow-hidden rounded-[10px] border border-slate-200 bg-white py-1 shadow-md"
        >
          {VISIBLE_LANGUAGES.map((lang) => {
            const selected = lang.id === safeValue;
            return (
              <li key={lang.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => select(lang.id)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 border-none px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                    selected
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <FlagAvatar countryCode={lang.countryCode} selected={selected} />
                  {lang.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Choisir la langue"
        className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300"
      >
        <FlagAvatar countryCode={current.countryCode} />
        <span className="whitespace-nowrap font-semibold">{current.label}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
    </div>
  );
}
