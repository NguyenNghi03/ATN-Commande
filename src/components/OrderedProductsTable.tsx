import { Trash2 } from 'lucide-react';
import { Card } from './ui';
import type { OrderRow } from '../types/order';

const GRID_COLS = 'minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 0.55fr) minmax(0, 0.45fr)';

const uniteBadgeClass: Record<string, string> = {
  kg: 'bg-blue-50 text-blue-700 ring-blue-100',
  cagette: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  colis: 'bg-amber-50 text-amber-700 ring-amber-100',
  piece: 'bg-slate-50 text-slate-600 ring-slate-100',
};

function ColumnHeader({ children, align }: { children: React.ReactNode; align: 'left' | 'center' }) {
  return (
    <div
      className={`text-[13px] font-extrabold uppercase tracking-[0.1em] text-blue-700 ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
    >
      {children}
    </div>
  );
}

function QuantityStepper({
  value,
  onDecrease,
  onIncrease,
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onDecrease}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[17px] font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
        aria-label="Diminuer la quantité"
      >
        −
      </button>
      <span className="min-w-[2.75rem] px-1 text-center text-[13px] font-semibold tabular-nums text-slate-800">
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrease}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-[17px] font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
        aria-label="Augmenter la quantité"
      >
        +
      </button>
    </div>
  );
}

type OrderedProductsTableProps = {
  rows: OrderRow[];
  onQtyChange: (id: number, qte: number) => void;
  onRemove: (id: number) => void;
};

export function OrderedProductsTable({ rows, onQtyChange, onRemove }: OrderedProductsTableProps) {
  const adjustQty = (id: number, delta: number) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    onQtyChange(id, Math.max(0, row.qte + delta));
  };

  return (
    <Card className="products-panel w-full p-0">
      <div className="products-table">
        <div className="products-table__header" style={{ gridTemplateColumns: GRID_COLS }}>
          <ColumnHeader align="left">Produit</ColumnHeader>
          <ColumnHeader align="center">Quantité</ColumnHeader>
          <ColumnHeader align="left">Unité</ColumnHeader>
          <ColumnHeader align="center">Action</ColumnHeader>
        </div>

        <div className="products-table__body">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-slate-400">
              Aucun produit — parlez ou saisissez une commande
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="product-row"
                style={{ gridTemplateColumns: GRID_COLS }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[20px] leading-none ring-1 ${row.avatar}`}>
                    {row.emoji}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-slate-800">{row.produit}</div>
                    <div className="truncate text-[11px] text-slate-400">{row.categorie}</div>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <QuantityStepper
                    value={row.qte}
                    onDecrease={() => adjustQty(row.id, -10)}
                    onIncrease={() => adjustQty(row.id, 10)}
                  />
                </div>

                <div className="flex items-center">
                  <span
                    className={`inline-flex rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize ring-1 ${
                      uniteBadgeClass[row.unite] ?? 'bg-slate-50 text-slate-600 ring-slate-100'
                    }`}
                  >
                    {row.unite}
                  </span>
                </div>

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => onRemove(row.id)}
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label={`Supprimer ${row.produit}`}
                  >
                    <Trash2 size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
