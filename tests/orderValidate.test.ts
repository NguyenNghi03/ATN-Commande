import { describe, expect, it } from 'vitest';
import { isValidateIntent } from '../src/lib/orderValidate';
import { scanReadyVoiceChunks, createProgressiveVoiceState } from '../src/lib/progressiveVoice';
import { splitIntoKeyChunks } from '../src/lib/splitKeyChunks';

describe('orderValidate — isValidateIntent', () => {
  it('FR — valide la commande, c\'est bon', () => {
    expect(isValidateIntent('valide la commande')).toBe(true);
    expect(isValidateIntent("c'est bon")).toBe(true);
  });

  it('VI — thanh toán đơn hàng (có/không dấu)', () => {
    expect(isValidateIntent('thanh toán đơn hàng')).toBe(true);
    expect(isValidateIntent('thanh toan don hang')).toBe(true);
    expect(isValidateIntent('xac nhan don')).toBe(true);
    expect(isValidateIntent('chot don')).toBe(true);
  });

  it('EN — validate / checkout', () => {
    expect(isValidateIntent('validate order')).toBe(true);
    expect(isValidateIntent('checkout')).toBe(true);
  });

  it('không nhận câu thêm sản phẩm', () => {
    expect(isValidateIntent('them 5 cam')).toBe(false);
  });
});

describe('orderValidate — progressive voice v2', () => {
  it('emit ngay « thanh toan don hang » không chờ speechend', () => {
    const state = createProgressiveVoiceState();
    const ready = scanReadyVoiceChunks('thanh toan don hang', 'vi', state);
    expect(ready).toEqual(['thanh toan don hang']);
  });

  it('tách sản phẩm và thanh toán trong cùng câu', () => {
    const chunks = splitIntoKeyChunks('them 5 cam thanh toan don hang');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some((c) => isValidateIntent(c))).toBe(true);
    expect(chunks.some((c) => c.includes('cam'))).toBe(true);
  });
});
