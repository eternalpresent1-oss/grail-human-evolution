import {
  activeDisciplineStep,
  currentDisciplineStep,
  disciplineNodeState,
  isDisciplineTreeComplete,
  sanitizeDisciplineCompleted,
  withCompletedDisciplineStep,
  withUncompletedDisciplineStep,
} from '@/utils/disciplineTree';

describe('discipline tree', () => {
  it('keeps a contiguous climb and drops a skip', () => {
    expect(sanitizeDisciplineCompleted([1, 2, 3])).toEqual([1, 2, 3]);
    expect(sanitizeDisciplineCompleted([1, 2, 5])).toEqual([1, 2]);
    expect(sanitizeDisciplineCompleted(['1', 1])).toEqual([1]);
  });

  it('treats the next uncompleted step as active', () => {
    expect(activeDisciplineStep([])).toBe(1);
    expect(activeDisciplineStep([1, 2])).toBe(3);
    expect(activeDisciplineStep([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBeNull();
    expect(disciplineNodeState(1, [])).toBe('active');
    expect(disciplineNodeState(2, [])).toBe('locked');
    expect(disciplineNodeState(1, [1])).toBe('completed');
  });

  it('completes only the active step', () => {
    expect(withCompletedDisciplineStep([], 1)).toEqual([1]);
    expect(withCompletedDisciplineStep([], 2)).toEqual([]);
    expect(withCompletedDisciplineStep([1], 2)).toEqual([1, 2]);
  });

  it('undoes a step and everything after it', () => {
    expect(withUncompletedDisciplineStep([1, 2, 3], 3)).toEqual([1, 2]);
    expect(withUncompletedDisciplineStep([1, 2, 3], 1)).toEqual([]);
    expect(withUncompletedDisciplineStep([1, 2], 4)).toEqual([1, 2]);
  });

  it('knows when the whole climb is closed', () => {
    expect(isDisciplineTreeComplete([])).toBe(false);
    expect(isDisciplineTreeComplete([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(false);
    expect(isDisciplineTreeComplete([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(true);
  });

  it('names the current stage for the proof card', () => {
    expect(currentDisciplineStep([])).toBe(1);
    expect(currentDisciplineStep([1, 2, 3])).toBe(4);
    expect(currentDisciplineStep([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(10);
  });
});
