import { useState } from 'react';
import { shortId } from '../format';

const EXPLORER = 'https://stellar.expert/explorer/public/contract/';

/** A contract or account id: shortened, copyable, and linked to the explorer. */
export function CopyId({ id, explorer = EXPLORER }: { id: string; explorer?: string }) {
  const [done, setDone] = useState(false);
  return (
    <span>
      <span className="mono" title={id}>
        {shortId(id)}
      </span>
      <button
        type="button"
        className="copy"
        onClick={() => {
          navigator.clipboard?.writeText(id).then(
            () => {
              setDone(true);
              setTimeout(() => setDone(false), 1500);
            },
            () => undefined,
          );
        }}
      >
        {done ? 'Copied' : 'Copy'}
      </button>
      <a href={`${explorer}${id}`} target="_blank" rel="noreferrer noopener">
        Explorer
      </a>
    </span>
  );
}
