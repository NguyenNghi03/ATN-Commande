import { Printer, X } from 'lucide-react';
import { BonDeCommande } from '../components/BonDeCommande';
import { loadBonDeCommandeSnapshot, mainAppUrl } from '../lib/bonDeCommandeUrl';
import { buildOrderForm, EMPTY_ADMIN } from '../lib/orderForm';

const EMPTY_FORM = buildOrderForm(EMPTY_ADMIN, [], { date_commande: '' });

export function BonDeCommandePage() {
  const snapshot = loadBonDeCommandeSnapshot();
  const form = snapshot?.form ?? EMPTY_FORM;
  const orderId = snapshot?.orderId ?? '';

  const goHome = () => {
    window.location.href = mainAppUrl();
  };

  return (
    <div className="bon-page">
      <div className="bon-page__toolbar">
        <button type="button" onClick={() => window.print()} className="bon-page__btn bon-page__btn--primary">
          <Printer size={16} strokeWidth={2} />
          Imprimer
        </button>
        <button type="button" onClick={goHome} className="bon-page__btn">
          <X size={16} strokeWidth={2} />
          Nouvelle commande
        </button>
      </div>

      <div className="bon-page__sheet">
        {!snapshot ? (
          <p className="bon-page__empty">
            Aucune commande à afficher — ouvrez le bon depuis l&apos;application principale.
          </p>
        ) : null}
        <BonDeCommande form={form} orderId={orderId} variant="page" />
      </div>
    </div>
  );
}
