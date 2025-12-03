import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '../useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = 'Original Title';

  beforeEach(() => {
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
  });

  it('should set document.title on mount', () => {
    const testTitle = 'Test Page – QSurvey System';
    renderHook(() => useDocumentTitle(testTitle));
    
    expect(document.title).toBe(testTitle);
  });

  it('should update document.title when title changes', () => {
    const initialTitle = 'Initial Title';
    const updatedTitle = 'Updated Title';
    
    const { rerender } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: initialTitle } }
    );
    
    expect(document.title).toBe(initialTitle);
    
    rerender({ title: updatedTitle });
    expect(document.title).toBe(updatedTitle);
  });

  it('should restore original title on unmount', () => {
    const testTitle = 'Test Title';
    const { unmount } = renderHook(() => useDocumentTitle(testTitle));
    
    expect(document.title).toBe(testTitle);
    
    unmount();
    expect(document.title).toBe(originalTitle);
  });

  it('should handle empty string title', () => {
    renderHook(() => useDocumentTitle(''));
    expect(document.title).toBe('');
  });
});
