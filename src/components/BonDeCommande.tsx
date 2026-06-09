import type { OrderForm } from '../types/orderForm';

function valueOr(value: string, placeholder = '—'): string {
  return value.trim() ? value : placeholder;
}

function formatEur(value: number | null): string {
  if (value == null) return '—';
  return `${value.toFixed(2)} €`;
}

function formatPrice(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(2);
}

type BonDeCommandeProps = {
  form: OrderForm;
  orderId?: string;
  variant?: 'preview' | 'page';
};

/** Aperçu / page bon de commande client — mise en page document imprimable. */
export function BonDeCommande({ form, orderId, variant = 'preview' }: BonDeCommandeProps) {
  const isPage = variant === 'page';
  const tvaLabel =
    form.totals.tva_rate != null ? `TVA (${form.totals.tva_rate}%)` : 'TVA';

  return (
    <article className={`bon-invoice${isPage ? ' bon-invoice--page' : ''}`}>
      <header className="bon-invoice__header">
        <h1 className="bon-invoice__title">{form.title}</h1>
        <hr className="bon-invoice__rule" />
      </header>

      <section className="bon-invoice__info" aria-label="Informations commande">
        <p>
          <span className="bon-invoice__label">Fournisseur :</span>{' '}
          {valueOr(form.fournisseur)}
        </p>
        <p>
          <span className="bon-invoice__label">Client :</span>{' '}
          {valueOr(form.client.name)}
          {form.client.code ? ` (Code : ${form.client.code})` : ''}
        </p>
        <p>
          <span className="bon-invoice__label">Adresse :</span>{' '}
          {valueOr(form.client.address)}
        </p>
        <p>
          <span className="bon-invoice__label">Date commande :</span>{' '}
          {valueOr(form.date_commande)}
        </p>
        <p>
          <span className="bon-invoice__label">Date livraison :</span>{' '}
          {valueOr(form.date_livraison)}
          {form.creneau_livraison ? ` (${form.creneau_livraison.toUpperCase()})` : ''}
        </p>
        {orderId ? (
          <p className="bon-invoice__order-ref">
            <span className="bon-invoice__label">Réf. commande :</span> {orderId}
          </p>
        ) : null}
      </section>

      <div className="bon-invoice__table-wrap">
        <table className="bon-invoice__table">
          <thead>
            <tr>
              <th>Réf</th>
              <th>Désignation</th>
              <th>Unité</th>
              <th>Qté</th>
              <th>PU (€)</th>
              <th>Total (€)</th>
            </tr>
          </thead>
          <tbody>
            {form.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="bon-invoice__empty">
                  Aucune ligne de commande.
                </td>
              </tr>
            ) : (
              form.lines.map((line, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="bon-invoice__designation">{line.designation}</td>
                  <td>{line.unite}</td>
                  <td>{line.qte}</td>
                  <td>{formatPrice(line.pu_eur)}</td>
                  <td>{formatPrice(line.total_eur)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="bon-invoice__footer">
        <div className="bon-invoice__totals">
          <p>Total HT : {formatEur(form.totals.total_ht)}</p>
          <p>
            {tvaLabel} : {formatEur(form.totals.tva_amount)}
          </p>
          <hr className="bon-invoice__totals-rule" />
          <p className="bon-invoice__ttc">
            Total TTC : <strong>{formatEur(form.totals.total_ttc)}</strong>
          </p>
        </div>

        <div className="bon-invoice__signatures">
          <p className="bon-invoice__signature-line">
            <span>Commande passée par :</span>
            <span className="bon-invoice__signature-field">
              {form.commande_passee_par || '\u00A0'}
            </span>
          </p>
          <p className="bon-invoice__signature-line">
            <span>Validation client :</span>
            <span className="bon-invoice__signature-field">
              {form.validation_client || '\u00A0'}
            </span>
          </p>
          <p className="bon-invoice__obs">
            <span>Observations :</span> {valueOr(form.observations, '')}
          </p>
        </div>
      </footer>
    </article>
  );
}
