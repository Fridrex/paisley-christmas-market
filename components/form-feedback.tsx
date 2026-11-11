'use client';

import { type ReactNode, useEffect, useRef } from 'react';

export const FormFeedback = ({ children, focusOn }: { children: ReactNode; focusOn: object }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, [focusOn]);
  return <div className="form-feedback" tabIndex={-1} ref={ref} role="alert">{children}</div>;
};
