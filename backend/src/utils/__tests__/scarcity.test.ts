import { newlyScarce, levelsBefore, StockLevels } from '../stock.utils';

const levels = (e1: [number, number], e2: [number, number] = [100, 100], e3: [number, number] = [100, 100]): StockLevels => ({
  emk1Remaining: e1[0], emk1Total: e1[1],
  emk2Remaining: e2[0], emk2Total: e2[1],
  emk3Remaining: e3[0], emk3Total: e3[1],
});

describe('newlyScarce — Section C.9 transitions', () => {
  it('fires when remaining crosses below 30%', () => {
    expect(newlyScarce(levels([30, 100]), levels([29, 100]))).toEqual(['EMK1']);
  });

  it('does not fire at exactly 30% (threshold is strictly below)', () => {
    expect(newlyScarce(levels([31, 100]), levels([30, 100]))).toEqual([]);
  });

  it('does not fire again while already scarce', () => {
    expect(newlyScarce(levels([20, 100]), levels([10, 100]))).toEqual([]);
  });

  it('fires when a larger allocation makes existing stock scarce', () => {
    expect(newlyScarce(levels([40, 100]), levels([40, 200]))).toEqual(['EMK1']);
  });

  it('ignores types with no allocation', () => {
    expect(newlyScarce(levels([0, 0]), levels([0, 0]))).toEqual([]);
  });

  it('reports every type that crossed', () => {
    expect(newlyScarce(levels([50, 100], [50, 100]), levels([10, 100], [10, 100]))).toEqual(['EMK1', 'EMK2']);
  });
});

describe('levelsBefore', () => {
  it('reverses the deltas applied to Remaining', () => {
    const before = levelsBefore(levels([20, 100], [5, 100]), { EMK1: -15, EMK2: 5 });
    expect(before.emk1Remaining).toBe(35);
    expect(before.emk2Remaining).toBe(0);
    expect(before.emk3Remaining).toBe(100);
    expect(before.emk1Total).toBe(100);
  });
});
