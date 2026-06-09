import { describe, expect, it } from 'vitest';
import { BON_DE_COMMANDE_HASH } from '../src/lib/bonDeCommandeUrl';

describe('bonDeCommandeUrl', () => {
  it('hash hóa đơn chuẩn #/bon-de-commande', () => {
    expect(BON_DE_COMMANDE_HASH).toBe('#/bon-de-commande');
  });
});
