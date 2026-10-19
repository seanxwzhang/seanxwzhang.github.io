import type { ReactNode } from 'react';

interface FigureProps {
  width?: 'normal' | 'wide' | 'full';
  caption?: string;
  children: ReactNode;
}

export default function Figure({ width = 'normal', caption, children }: FigureProps) {
  const widthClass = {
    normal: 'figure-normal',
    wide: 'figure-wide',
    full: 'figure-full',
  }[width];

  return (
    <figure className={`distill-figure ${widthClass}`}>
      <div className="figure-content">
        {children}
      </div>
      {caption && (
        <figcaption className="figure-caption">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
