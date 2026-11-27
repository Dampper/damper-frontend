import type { ReactNode } from 'react';
import { href } from '../router';
import type { GlossaryKey } from './glossary';

/** Links a first-appearance of a jargon term to its Method-page glossary entry (#20). */
export function GlossaryTerm({ term, children }: { term: GlossaryKey; children: ReactNode }) {
  return <a href={href.method(term)}>{children}</a>;
}
