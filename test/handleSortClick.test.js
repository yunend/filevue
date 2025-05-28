// handleSortClick.test.js
/**
 * @jest-environment jsdom
 */

const FileVue = require('../public/js/filevue');

describe('handleSortClick', () => {
  let fileVue;

  beforeEach(() => {
    fileVue = new FileVue();
    fileVue.loadDirectory = jest.fn();
    fileVue.currentPath = '/test';
    fileVue.sortState = {
      byName: 'asc',
      byDate: null
    };
  });

  test('点击名称排序应切换排序方向', () => {
    // 初始状态
    expect(fileVue.sortState.byName).toBe('asc');
    expect(fileVue.sortState.byDate).toBeNull();

    // 第一次点击
    fileVue.handleSortClick('name');
    expect(fileVue.sortState.byName).toBe('desc');
    expect(fileVue.sortState.byDate).toBeNull();
    expect(fileVue.loadDirectory).toHaveBeenCalledWith('/test');

    // 第二次点击
    fileVue.handleSortClick('name');
    expect(fileVue.sortState.byName).toBe('asc');
  });

  test('点击日期排序应切换排序方向', () => {
    // 初始状态
    expect(fileVue.sortState.byDate).toBeNull();

    // 第一次点击
    fileVue.handleSortClick('date');
    expect(fileVue.sortState.byDate).toBe('asc');
    expect(fileVue.sortState.byName).toBeNull();

    // 第二次点击
    fileVue.handleSortClick('date');
    expect(fileVue.sortState.byDate).toBe('desc');
  });

  test('切换排序类型应重置另一种排序状态', () => {
    // 先设置名称排序
    fileVue.handleSortClick('name');
    expect(fileVue.sortState.byName).toBe('desc');
    
    // 切换到日期排序
    fileVue.handleSortClick('date');
    expect(fileVue.sortState.byName).toBeNull();
    expect(fileVue.sortState.byDate).toBe('asc');
  });

  test('无效排序类型不应改变状态', () => {
    const initialState = {...fileVue.sortState};
    fileVue.handleSortClick('invalid');
    expect(fileVue.sortState).toEqual(initialState);
  });
});
