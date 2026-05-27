import { estimateLabelWidth, truncateLabelToWidth } from '../utils';

describe('estimateLabelWidth', () => {
  it('returns 0 for empty string', () => {
    const result = estimateLabelWidth('');
    expect(result).toBe(0);
  });

  it('returns ASCII_CHAR_WIDTH_PX x length for pure ASCII string', () => {
    const result = estimateLabelWidth('Hello');
    expect(result).toBe(50); // 5 chars * 10px each
  });

  it('returns CJK_CHAR_WIDTH_PX x length for pure CJK string', () => {
    const result = estimateLabelWidth('你好');
    expect(result).toBe(28); // 2 chars * 14px each
  });

  it('returns correct width for mixed string', () => {
    const result = estimateLabelWidth('Hello你好');
    expect(result).toBe(78); // 5 ASCII chars * 10px + 2 CJK chars * 14px
  });

  it('returns correct width for string with spaces and punctuation', () => {
    const result = estimateLabelWidth('Hi, 你好!');
    // 3 ASCII chars 'Hi,' * 10px + 2 CJK chars * 14px + 1 ASCII char (!) * 10px + 1 space * 10px
    expect(result).toBe(78);
  });

  it('returns correct width for string with full-width characters', () => {
    const result = estimateLabelWidth('Ｈｅｌｌｏ'); // Full-width "Hello"
    // 5 full-width chars * 14px each
    expect(result).toBe(70);
  });

  it('returns correct width for string with CJK string and full-width punctuation', () => {
    const result = estimateLabelWidth('你好，世界！'); // "Hello, World!" in Chinese with punctuation
    // 4 CJK chars * 14px + 2 full-width punctuation chars * 14px
    expect(result).toBe(84);
  });

  it('returns correct width for string with CJK string and full-width punctuation and full-width spaces', () => {
    const result = estimateLabelWidth('你好，　世界！'); // "Hello, World!" in Chinese with punctuation and full-width space
    // 4 CJK chars * 14px + 2 full-width punctuation chars * 14px + 1 full-width space * 14px
    expect(result).toBe(98);
  }); 
});

describe('truncateLabelToWidth', () => {
  it('returns original label if it fits within maxWidth', () => {
    const label = 'Hello';
    const result = truncateLabelToWidth(label, 100);
    expect(result).toBe(label);
  });

  it('truncates label and adds ellipsis if it exceeds maxWidth', () => {
    const label = 'Hello, 你好!';
    const result = truncateLabelToWidth(label, 60); // Should only fit "Hello"
    expect(result).toBe('Hello…');
  });

  it('handles edge case where maxWidth is smaller than ellipsis width', () => {
    const label = 'Hello';
    const result = truncateLabelToWidth(label, 5); // Ellipsis itself is wider than 5px
    expect(result).toBe('…');
  });

  it('handles edge case where maxWidth is exactly the width of the label', () => {
    const label = 'Hi';
    const result = truncateLabelToWidth(label, 20); // 2 chars * 10px each
    expect(result).toBe(label);
  });

  it('truncates CJK string and adds ellipsis', () => {
    const label = '你好世界你好世界你好世界你好';  // 13 個中文字
    const result = truncateLabelToWidth(label, 100);
    // 預期：14 × n + 10 ≤ 100 → n ≤ 6.4 → n = 6
    // result = '你好世界你好' + '…'
    expect(result).toBe('你好世界你好…');
  });

  it('truncates mixed string and adds ellipsis', () => {
    const label = 'Hello你好世界';
    const result = truncateLabelToWidth(label, 80);
    // 預期：10 × 5 + 14 × n + 10 ≤ 80 → 14n ≤ 20 → n ≤ 1.43 → n = 1
    // result = 'Hello' + '你' + '…'
    expect(result).toBe('Hello你…');
  });

  // Post-condition / Invariant test: The resulting truncated label should always be less than or equal to maxWidth, even for very long input strings.
  it('result width is always <= maxWidth for any long input', () => {
    const longLabel = 'A'.repeat(100);  // 100 個 A
    const maxWidth = 80;
    const result = truncateLabelToWidth(longLabel, maxWidth);
    expect(estimateLabelWidth(result)).toBeLessThanOrEqual(maxWidth);
  });
});