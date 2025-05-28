// sortItems.test.js
/**
 * @jest-environment jsdom
 */

global.window = {
  open: jest.fn(),
  location: { href: '' },
  onload: null
};

const FileVue = require('../public/js/filevue');

describe('sortItems', () => {
  let fileVue;
  const mockItems = [
    { name: 'FileB', mtime: '2023-01-02' },
    { name: 'FileA', mtime: '2023-01-01' },
    { name: 'FileC', mtime: '2023-01-03' }
  ];

  beforeEach(() => {
    fileVue = new FileVue(); // 创建实例
  });

  test('按名称升序排序', () => {
    const sorted = fileVue.sortItems(mockItems, 'name', 'asc');
    expect(sorted[0].name).toBe('FileA');
    expect(sorted[1].name).toBe('FileB');
    expect(sorted[2].name).toBe('FileC');
  });

  test('按名称降序排序', () => {
    const sorted = fileVue.sortItems(mockItems, 'name', 'desc');
    expect(sorted[0].name).toBe('FileC');
    expect(sorted[1].name).toBe('FileB');
    expect(sorted[2].name).toBe('FileA');
  });

  test('按日期升序排序', () => {
    const sorted = fileVue.sortItems(mockItems, 'date', 'asc');
    expect(sorted[0].mtime).toBe('2023-01-01');
    expect(sorted[1].mtime).toBe('2023-01-02');
    expect(sorted[2].mtime).toBe('2023-01-03');
  });

  test('按日期降序排序', () => {
    const sorted = fileVue.sortItems(mockItems, 'date', 'desc');
    expect(sorted[0].mtime).toBe('2023-01-03');
    expect(sorted[1].mtime).toBe('2023-01-02');
    expect(sorted[2].mtime).toBe('2023-01-01');
  });

  test('无效排序类型应返回原顺序', () => {
    const original = [...mockItems];
    const sorted = fileVue.sortItems(mockItems, 'invalid', 'asc');
    expect(sorted).toEqual(original);
  });
});
