import { useEffect, useRef } from 'react';

/**
 * Custom hook to manage document.title
 * Sets the title on mount/update and restores the default on unmount
 * 
 * @param title - The title to set for the current page
 * 
 * @example
 * ```tsx
 * const SurveyEdit: React.FC = () => {
 *   useDocumentTitle(`Edit ${surveyTitle} – QSurvey System`);
 *   // ...
 * };
 * ```
 */
export const useDocumentTitle = (title: string): void => {
  const defaultTitle = useRef(document.title);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    // Capture the default title at mount time for cleanup
    const titleAtMount = defaultTitle.current;
    // Cleanup: restore default title on unmount
    return () => {
      document.title = titleAtMount;
    };
  }, []);
};
