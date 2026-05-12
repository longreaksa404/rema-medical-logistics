import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} - REMA`;
    return () => { document.title = 'REMA'; };
  }, [title]);
}