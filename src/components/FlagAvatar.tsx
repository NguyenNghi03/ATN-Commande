import type { ComponentType, SVGProps } from 'react';
import FR from 'country-flag-icons/react/1x1/FR';
import US from 'country-flag-icons/react/1x1/US';
import VN from 'country-flag-icons/react/1x1/VN';
import type { CountryCode } from '../data/languages';

type FlagSvg = ComponentType<SVGProps<SVGSVGElement>>;

const FLAGS: Record<CountryCode, FlagSvg> = {
  FR,
  US,
  VN,
};

type FlagAvatarProps = {
  countryCode: CountryCode;
  selected?: boolean;
};

export function FlagAvatar({ countryCode, selected = false }: FlagAvatarProps) {
  const Flag = FLAGS[countryCode];

  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ${
        selected ? 'ring-white/40' : 'ring-slate-200/90'
      }`}
      aria-hidden
    >
      <Flag className="h-full w-full" title={countryCode} />
    </span>
  );
}
