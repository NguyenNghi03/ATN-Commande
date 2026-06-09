import { describe, expect, it } from 'vitest';
import { parseOrder } from '../src/lib/parseOrder';
import { products, triggers, units } from '../src/data/keywords';

const NOW = new Date('2026-06-09T03:00:00.000Z');
const parse = (t: string) => parseOrder(t, { source: 'text', now: NOW }).order;

describe('P3-TASK-004 #1 - Product aliases (26 products)', () => {
  it('có đúng 26 sản phẩm trong từ điển', () => {
    expect(products).toHaveLength(26);
  });

  for (const p of products) {
    const alias = p.keywords.fr[0];
    it(`alias "${alias}" → ${p.produit}`, () => {
      const order = parse(`5 kg de ${alias}`);
      expect(order.items.map((i) => i.product)).toContain(p.produit.toLowerCase());
    });
  }
});

describe('P3-TASK-004 #2 - Unit normalization', () => {
  it('kg / kilo / kilos → kg', () => {
    for (const w of ['kg', 'kilo', 'kilos']) {
      expect(parse(`5 ${w} de tomates`).items[0].unit).toBe('kg');
    }
  });
  it('thiếu unit → pièce', () => {
    expect(parse('5 tomates').items[0].unit).toBe('pièce');
  });
  it('cagette / botte / colis', () => {
    expect(parse('2 cagettes de fraises').items[0].unit).toBe('cagette');
    expect(parse('3 bottes de poireaux').items[0].unit).toBe('botte');
    expect(parse("8 colis d'oranges").items[0].unit).toBe('colis');
  });
  it('đủ 5 đơn vị trong từ điển', () => {
    expect(units.map((u) => u.unite).sort()).toEqual(
      ['botte', 'cagette', 'colis', 'kg', 'piece'].sort(),
    );
  });
});

describe('P3-TASK-004 #3 - Noise skip', () => {
  for (const phrase of ['bonjour', 'merci', 'allo', 'ça va']) {
    it(`"${phrase}" → ignored, no item`, () => {
      const order = parse(phrase);
      expect(order.items).toHaveLength(0);
      expect(order.ignored_segments.length).toBeGreaterThan(0);
    });
  }
});

describe('P3-TASK-004 #4 - Client triggers', () => {
  for (const trig of triggers.client) {
    it(`"${trig}" → client Dupont`, () => {
      expect(parse(`${trig} Dupont 5 kg de tomates`).client).toBe('Dupont');
    });
  }
});

describe('P3-TASK-004 #5 - Site triggers', () => {
  for (const trig of triggers.site) {
    it(`"${trig}" → site Nord`, () => {
      expect(parse(`${trig} Nord 5 kg de tomates`).site).toBe('Nord');
    });
  }
});

describe('P3-TASK-004 #6 - Date tokens', () => {
  for (const token of triggers.date_tokens) {
    it(`"${token}" → date set`, () => {
      expect(parse(`${token} 5 kg de tomates`).date_livraison).toBeTruthy();
    });
  }
  it('dd/mm và dd/mm/yyyy', () => {
    expect(parse('5 kg de tomates le 15/06').date_livraison).toBe('15/06');
    expect(parse('5 kg de tomates le 15/06/2026').date_livraison).toBe('15/06/2026');
  });
});

describe('P3-TASK-004 #7 - Time window tokens', () => {
  for (const token of triggers.creneau) {
    it(`"${token}" → creneau set`, () => {
      expect(parse(`5 kg de tomates ${token}`).creneau_livraison).toBeTruthy();
    });
  }
});

describe('P3-TASK-004 #8 - Negation', () => {
  for (const neg of ['pas de', 'pas', 'sans']) {
    it(`"${neg} tomates" → no item`, () => {
      expect(parse(`${neg} tomates`).items).toHaveLength(0);
    });
  }
});

describe('P3-TASK-004 #9 - Correction', () => {
  for (const trig of ['non', 'plutôt', 'en fait']) {
    it(`"5 tomates ${trig} 6 tomates" → 6`, () => {
      const order = parse(`5 tomates ${trig} 6 tomates`);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(6);
    });
  }
});

describe('P3-TASK-004 #10/#11 - Error behavior + reprompt once', () => {
  it('unknown product → no item + ignored', () => {
    const order = parse('20 kg de licorne');
    expect(order.items).toHaveLength(0);
    expect(order.ignored_segments.length).toBeGreaterThan(0);
  });
  it('missing quantity → reprompt missingQuantity', () => {
    const order = parse("j'ai besoin de tomates");
    expect(order.reprompt.reason).toBe('missingQuantity');
  });
  it('no valid items → reprompt noValidItems', () => {
    expect(parse('bonjour').reprompt.reason).toBe('noValidItems');
  });
  it('không reprompt lặp khi already_asked', () => {
    const order = parseOrder("j'ai besoin de tomates", {
      source: 'text',
      now: NOW,
      alreadyAsked: true,
    }).order;
    expect(order.reprompt.required).toBe(false);
  });
  it('unité ngoài V1 (tonnes) → skip, không quy về pièce', () => {
    const { order, skipped } = parseOrder('2 tonnes de pommes de terre', { source: 'text', now: NOW });
    expect(order.items).toHaveLength(0);
    expect(skipped.some((s) => s.reason === 'out_of_scope_unit')).toBe(true);
  });
});
