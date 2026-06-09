import { User, Building2, Calendar, Clock, MessageSquare } from 'lucide-react';
import { SectionLabel } from './ui';
import type { AdminFieldKey } from '../hooks/useOrderState';
import type { AdminFields } from '../lib/orderForm';

const FIELDS: {
  key: AdminFieldKey;
  label: string;
  icon: typeof User;
  placeholder: string;
  bg: string;
}[] = [
  { key: 'client', label: 'Client', icon: User, placeholder: 'Nom client…', bg: '/img/card001.png' },
  { key: 'site', label: 'Site', icon: Building2, placeholder: 'Entrepôt, magasin…', bg: '/img/card002.png' },
  {
    key: 'date_livraison',
    label: 'Date livraison',
    icon: Calendar,
    placeholder: 'demain, vendredi, 15/06…',
    bg: '/img/card003.png',
  },
  { key: 'creneau_livraison', label: 'Créneau', icon: Clock, placeholder: 'matin, avant 10h…', bg: '/img/card004.png' },
  {
    key: 'commentaire_livraison',
    label: 'Commentaire',
    icon: MessageSquare,
    placeholder: 'Instructions livraison…',
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
  onChange,
}: {
  icon: typeof User;
  label: string;
  value: string;
  bg: string;
  placeholder: string;
  onChange: (value: string) => void;
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
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="m-0 w-full truncate border-none bg-transparent p-0 text-[12.5px] font-bold leading-tight text-blue-900 outline-none placeholder:font-medium placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

/** Panneau champs administratifs éditables (P2-TASK-004). */
export function AdminPanel({ admin, onChange }: AdminPanelProps) {
  return (
    <div className="admin-panel w-full shrink-0">
      <SectionLabel compact>Informations commande</SectionLabel>
      <div className="meta-fields-row mt-2">
        {FIELDS.map(({ key, label, icon, placeholder, bg }) => (
          <MetaFieldCard
            key={key}
            icon={icon}
            label={label}
            value={admin[key]}
            bg={bg}
            placeholder={placeholder}
            onChange={(value) => onChange(key, value)}
          />
        ))}
      </div>
    </div>
  );
}
