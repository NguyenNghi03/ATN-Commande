import { AlertCircle, X } from 'lucide-react';
import type { RepromptState } from '../types/parsedOrder';

type RepromptBannerProps = {
  reprompt: RepromptState;
  onDismiss: () => void;
};

/** Message yêu cầu nói lại một lần (P2-TASK-005). */
export function RepromptBanner({ reprompt, onDismiss }: RepromptBannerProps) {
  if (!reprompt.required || !reprompt.message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 px-3.5 py-2.5"
    >
      <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-600" strokeWidth={2} />
      <p className="m-0 flex-1 text-[13px] leading-snug text-amber-900">{reprompt.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md border-none bg-transparent p-0.5 text-amber-700 hover:bg-amber-100"
        aria-label="Fermer le rappel"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
