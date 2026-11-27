import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MethodPage } from '../src/components/MethodPage';
import { GLOSSARY, GLOSSARY_ORDER } from '../src/components/glossary';
import { href } from '../src/router';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  window.location.hash = '';
});

describe('MethodPage glossary (#20)', () => {
  it('has an entry, with a term and a definition, for every glossary key', () => {
    render(<MethodPage />);

    for (const key of GLOSSARY_ORDER) {
      const entry = document.getElementById(`glossary-${key}`);
      expect(entry, key).not.toBeNull();
      expect(entry!.textContent).toContain(GLOSSARY[key].term);
      expect(GLOSSARY[key].definition.length).toBeGreaterThan(10);
    }
  });

  it('renders every entry exactly once, in GLOSSARY_ORDER', () => {
    render(<MethodPage />);
    const dl = document.querySelector('dl.glossary')!;
    const ids = [...dl.children].map((el) => el.id);
    expect(ids).toEqual(GLOSSARY_ORDER.map((key) => `glossary-${key}`));
  });

  it('scrolls the named entry into view when the hash names a term on arrival', () => {
    window.location.hash = href.method('anchor');
    render(<MethodPage />);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('scrolls again when the term changes while already on the page', () => {
    window.location.hash = href.method('anchor');
    render(<MethodPage />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

    window.location.hash = href.method('exposure');
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('does not try to scroll when the hash names no term', () => {
    window.location.hash = href.method();
    render(<MethodPage />);

    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('href.method', () => {
  it('builds a plain link without a term and a ?term= link with one', () => {
    expect(href.method()).toBe('#/method');
    expect(href.method('anchor')).toBe('#/method?term=anchor');
  });
});
