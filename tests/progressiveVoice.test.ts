import { describe, expect, it } from 'vitest';
import {
  createProgressiveVoiceState,
  getUnprocessedVoiceTail,
  scanReadyVoiceChunks,
  splitLiveClauses,
} from '../src/lib/progressiveVoice';

describe('progressiveVoice - splitLiveClauses', () => {
  it('tách theo anchor hành động', () => {
    const parts = splitLiveClauses('them 100 kg oranges them 50 kg tomates');
    expect(parts.length).toBe(2);
    expect(parts[0]).toContain('oranges');
    expect(parts[1]).toContain('tomates');
  });

  it('tách theo số lượng khi không có anchor', () => {
    const parts = splitLiveClauses('100 kg oranges 50 kg tomates');
    expect(parts.length).toBe(2);
  });
});

describe('progressiveVoice - scanReadyVoiceChunks', () => {
  it('emit cụm đầu ngay khi anchor thứ hai xuất hiện', () => {
    const state = createProgressiveVoiceState();
    const live = 'them 100 kg oranges them 50';

    const first = scanReadyVoiceChunks(live, 'vi', state);
    expect(first).toEqual(['them 100 kg oranges']);

    const second = scanReadyVoiceChunks(`${live} kg tomates`, 'vi', state);
    expect(second).toEqual(['them 50 kg tomates']);
  });

  it('emit cụm duy nhất khi đủ key, không chờ cụm mới', () => {
    const state = createProgressiveVoiceState();
    const ready = scanReadyVoiceChunks('them 100 kg oranges', 'vi', state);
    expect(ready).toEqual(['them 100 kg oranges']);
    expect(getUnprocessedVoiceTail('them 100 kg oranges', state)).toBe('');
  });

  it('không emit lại cụm đã xử lý', () => {
    const state = createProgressiveVoiceState();
    scanReadyVoiceChunks('them 100 kg oranges', 'vi', state);
    const again = scanReadyVoiceChunks('them 100 kg oranges', 'vi', state);
    expect(again).toEqual([]);
  });

  it('giữ phần chưa đủ key cho speechend', () => {
    const state = createProgressiveVoiceState();
    scanReadyVoiceChunks('them 100 kg oranges them 50', 'vi', state);
    expect(getUnprocessedVoiceTail('them 100 kg oranges them 50', state)).toBe('them 50');
  });

  it('không emit sớm cụm ngầm (số lượng + sản phẩm) — chờ speechend', () => {
    const state = createProgressiveVoiceState();
    const ready = scanReadyVoiceChunks('2 trai tao', 'vi', state);
    expect(ready).toEqual([]);
    expect(getUnprocessedVoiceTail('2 trai tao', state)).toBe('2 trai tao');
  });
});
