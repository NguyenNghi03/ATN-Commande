import { useRef } from 'react';
import { User, Building2, Calendar, Clock, MessageSquare, CalendarDays } from 'lucide-react';
import { SectionLabel } from './ui';
import type { AdminFieldKey } from '../hooks/useOrderState';
import {
  ADMIN_FIELD_PLACEHOLDERS,
  creneauToPickerValue,
  dateLivraisonToPickerValue,
  pickerValueToCreneau,
  pickerValueToDateLivraison,
  resolveAdminFields,
  type AdminFields,
} from '../lib/orderForm';

const FIELDS: {
  key: AdminFieldKey;
  label: string;
  icon: typeof User;
  bg: string;
  picker?: 'date' | 'time';
}[] = [
  { key: 'client', label: 'Client', icon: User, bg: '/img/card001.png' },
  { key: 'site', label: 'Site', icon: Building2, bg: '/img/card002.png' },
  {
    key: 'date_livraison',
    label: 'Date livraison',
    icon: Calendar,
    bg: '/img/card003.png',
    picker: 'date',
  },
  {
    key: 'creneau_livraison',
    label: 'Créneau',
    icon: Clock,
    bg: '/img/card004.png',
    picker: 'time',
  },
  {
    key: 'commentaire_livraison',
    label: 'Commentaire',
    icon: MessageSquare,
    bg: '/img/card005.png',
  },
];

type AdminPanelProps = {
  admin: AdminFields;
  onChange: (field: AdminFieldKey, value: string) => void;
};

function MetaFieldCard({
  icon: Icon,
  label,
  value,
  bg,
  placeholder,
  picker,
  pickerValue,
  onChange,
  onPickerChange,
}: {
  icon: typeof User;
  label: string;
  value: string;
  bg: string;
  placeholder: string;
  picker?: 'date' | 'time';
  pickerValue?: string;
  onChange: (value: string) => void;
  onPickerChange?: (value: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const isEmpty = !value.trim();
  const PickerIcon = picker === 'date' ? CalendarDays : Clock;

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      el.showPicker();
    } else {
      el.click();
    }
  };

  return (
    <div className="meta-field-card" style={{ backgroundImage: `url(${bg})` }}>
      <div className="meta-field-card__overlay">
        <div className="mb-1 flex items-center gap-1.5">
          <Icon size={12} color="#64748b" strokeWidth={2} />
          <span className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          {picker && pickerValue !== undefined && onPickerChange && (
            <>
              <input
                ref={pickerRef}
                type={picker}
                value={pickerValue}
                onChange={(e) => onPickerChange(e.target.value)}
                className="meta-field-card__picker-input"
                tabIndex={-1}
                aria-hidden
              />
              <button
                type="button"
                onClick={openPicker}
                className="meta-field-card__picker-btn"
                aria-label={picker === 'date' ? 'Choisir la date' : "Choisir l'heure"}
                title={picker === 'date' ? 'Choisir la date' : "Choisir l'heure"}
              >
                <PickerIcon size={14} strokeWidth={2} />
              </button>
            </>
          )}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`m-0 min-w-0 flex-1 truncate border-none bg-transparent p-0 text-[12.5px] leading-tight outline-none placeholder:font-medium placeholder:italic placeholder:text-slate-400 ${
              isEmpty ? 'font-medium text-slate-400' : 'font-bold text-blue-900'
            }`}
          />
        </div>
      </div>
    </div>
  );
}

/** Panneau champs administratifs éditables (P2-TASK-004). */
export function AdminPanel({ admin, onChange }: AdminPanelProps) {
  const resolved = resolveAdminFields(admin);

  return (
    <div className="admin-panel w-full shrink-0">
      <SectionLabel compact>Informations commande</SectionLabel>
      <div className="meta-fields-row mt-2">
        {FIELDS.map(({ key, label, icon, bg, picker }) => {
          const displayValue =
            key === 'date_livraison'
              ? resolved.date_livraison
              : key === 'creneau_livraison'
                ? resolved.creneau_livraison
                : admin[key];

          const pickerValue =
            picker === 'date'
              ? dateLivraisonToPickerValue(admin.date_livraison)
              : picker === 'time'
                ? creneauToPickerValue(admin.creneau_livraison)
                : undefined;

          const onPickerChange =
            picker === 'date'
              ? (iso: string) => onChange(key, pickerValueToDateLivraison(iso))
              : picker === 'time'
                ? (hhmm: string) => onChange(key, pickerValueToCreneau(hhmm))
                : undefined;

          return (
            <MetaFieldCard
              key={key}
              icon={icon}
              label={label}
              value={displayValue}
              bg={bg}
              placeholder={ADMIN_FIELD_PLACEHOLDERS[key]}
              picker={picker}
              pickerValue={pickerValue}
              onChange={(value) => onChange(key, value)}
              onPickerChange={onPickerChange}
            />
          );
        })}
      </div>
    </div>
  );
}
