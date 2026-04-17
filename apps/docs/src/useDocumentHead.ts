import { useEffect } from 'react';

interface Head {
  title: string;
  description: string;
}

// Lightweight head manager for a tiny CSR site. For a larger surface we'd
// reach for react-helmet-async, but two pages + one meta doesn't warrant it.
export function useDocumentHead({ title, description }: Head): void {
  useEffect(() => {
    document.title = title;
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute('content', description);
  }, [title, description]);
}
