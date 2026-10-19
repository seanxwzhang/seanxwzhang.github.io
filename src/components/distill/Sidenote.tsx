import type { ReactNode } from 'react';

interface SidenoteProps {
  id: string;
  children: ReactNode;
}

export default function Sidenote({ id, children }: SidenoteProps) {
  return (
    <span className="sidenote-wrapper">
      <label className="sidenote-toggle" htmlFor={`sn-${id}`} aria-label="Toggle sidenote">
        <sup className="sidenote-number"></sup>
      </label>
      <input type="checkbox" id={`sn-${id}`} className="sidenote-checkbox" />
      <span className="sidenote">
        {children}
      </span>
    </span>
  );
}
