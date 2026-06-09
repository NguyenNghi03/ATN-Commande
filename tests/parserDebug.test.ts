import { describe, expect, it } from 'vitest';
import { buildDebugLog, parseOrder } from '../src/lib/parseOrder';

const NOW = new Date('2026-06-09T03:00:00.000Z');

describe('P3-TASK-005 - Debug log', () => {
  it('có đủ trường và mỗi skipped segment có reason', () => {
    const log = buildDebugLog(
      'bonjour, commande pour Dupont 5 kg de tomates et pas de salades',
      { source: 'text', now: NOW },
    );
    expect(log.raw_text).toBeTruthy();
    expect(log.normalized_text).toBe(log.normalized_text.toLowerCase());
    expect(Array.isArray(log.segments)).toBe(true);
    expect(log.extracted_admin.client).toBe('Dupont');
    expect(log.extracted_items.length).toBeGreaterThan(0);
    for (const s of log.skipped_segments) {
      expect(s.reason).toBeTruthy();
    }
  });
});

describe('P3-TASK-005 - Performance', () => {
  it('parse một câu thường < 200ms', () => {
    const input = 'commande pour Dupont demain matin 5 kilos de tomates, 3 salades et 2 cagettes de fraises';
    const start = performance.now();
    for (let i = 0; i < 50; i++) parseOrder(input, { source: 'text', now: NOW });
    const avg = (performance.now() - start) / 50;
    expect(avg).toBeLessThan(200);
  });
});
