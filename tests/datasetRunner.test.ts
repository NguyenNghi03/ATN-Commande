import { describe, expect, it } from 'vitest';
import { parseOrder } from '../src/lib/parseOrder';
import dataset from './fixtures/dataset-200.sample.json';

type ExpectedItem = {
  product: string;
  quantity: number;
  unit: string;
  category: 'fruits_legumes';
};

type DatasetCase = {
  id: number;
  input: string;
  expected: {
    client: string;
    site: string;
    date_livraison: string;
    creneau_livraison: string;
    items: ExpectedItem[];
    ignored_segments: string[];
  };
};

const NOW = new Date('2026-06-09T03:00:00.000Z');
const cases = dataset.cases as DatasetCase[];

describe('P3-TASK-001 - dataset runner (sample)', () => {
  for (const c of cases) {
    it(`#${c.id} ${c.input.slice(0, 50)}`, () => {
      const { order } = parseOrder(c.input, { source: 'text', now: NOW });

      expect(order.client).toBe(c.expected.client);
      expect(order.site).toBe(c.expected.site);
      expect(order.date_livraison).toBe(c.expected.date_livraison);
      expect(order.creneau_livraison).toBe(c.expected.creneau_livraison);

      const gotItems = order.items.map((i) => ({
        product: i.product,
        quantity: i.quantity,
        unit: i.unit,
        category: i.category,
      }));
      expect(gotItems).toEqual(c.expected.items);
      expect(order.ignored_segments).toEqual(c.expected.ignored_segments);
    });
  }
});
