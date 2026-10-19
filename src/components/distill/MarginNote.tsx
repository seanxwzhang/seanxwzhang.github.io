import type { ReactNode } from 'react';

interface MarginNoteProps {
  id: string;
  children: ReactNode;
}

export default function MarginNote({ id, children }: MarginNoteProps) {
  return (
    <span className="marginnote-wrapper">
      <label className="marginnote-toggle" htmlFor={`mn-${id}`} aria-label="Toggle margin note">⊕</label>
      <input type="checkbox" id={`mn-${id}`} className="marginnote-checkbox" />
      <span className="marginnote">
        {children}
      </span>
    </span>
  );
}
