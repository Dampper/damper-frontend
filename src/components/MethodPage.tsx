import { useEffect } from 'react';
import { TIER_MEANING, TIER_ORDER } from '../derive';
import { hashQuery } from '../router';
import { GLOSSARY, GLOSSARY_ORDER } from './glossary';
import { TierBadge } from './TierBadge';

const BACKEND = 'https://github.com/Dampper/damper-backend';

/** Scrolls a glossary entry into view when the hash names one (`#/method?term=anchor`), on arrival and on a later jump while already here. */
function useGlossaryScroll(): void {
  useEffect(() => {
    const jump = () => {
      const term = hashQuery().get('term');
      if (term) document.getElementById(`glossary-${term}`)?.scrollIntoView({ block: 'center' });
    };
    jump();
    window.addEventListener('hashchange', jump);
    return () => window.removeEventListener('hashchange', jump);
  }, []);
}

export function MethodPage() {
  useGlossaryScroll();

  return (
    <div className="stack">
      <div className="page-title">
        <h1>How it is measured</h1>
        <p>What the numbers mean, where they come from, and what they leave out.</p>
      </div>

      <div className="card prose">
        <h2 id="glossary">Glossary</h2>
        <p>Terms used across the dashboard, linked from where each first appears (#20).</p>
        <dl className="glossary">
          {GLOSSARY_ORDER.map((key) => (
            <div key={key} id={`glossary-${key}`}>
              <dt>{GLOSSARY[key].term}</dt>
              <dd>{GLOSSARY[key].definition}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card prose">
        <h2>The question</h2>
        <p>
          A lending pool lends against whatever price its oracle reports. If someone can make that price false, they can
          borrow more than their collateral is worth and leave the pool with the loss. In February 2026 that happened to a
          Blend pool: one trade on a market with almost no volume moved a collateral price about 100× and about $10.2M was
          borrowed against it.
        </p>
        <p>
          For every reserve in every pool, the scan asks two things: <b>what could be taken if the price were false</b>, and{' '}
          <b>what it would cost to make it false</b>.
        </p>

        <h3>Where the price comes from</h3>
        <p>
          Most Blend pools read a single oracle, Blend&rsquo;s oracle aggregator, which maps each asset to exactly one upstream
          feed. The scan reads that mapping from the chain and classifies the upstream: Reflector&rsquo;s Stellar DEX feed,
          Reflector&rsquo;s feed of off-chain exchanges, or a feed that an admin key updates by hand.
        </p>

        <h3>What an attack would cost</h3>
        <p>
          Reflector&rsquo;s DEX feed is built from Stellar DEX trades. To make it report price P, an attacker has to trade at P,
          which means first buying every resting offer below P. So the dollars needed to clear the order book up to P are the
          capital needed to make the feed see P. The scan reads the public order book and measures that for a 10× move up (for
          collateral) and 10× down (for borrowed assets).
        </p>

        <h3>What an attacker could take</h3>
        <ul>
          <li>
            <b>Collateral side:</b> inflate the asset, post it as collateral, and borrow what the other reserves have
            available (up to their maximum utilisation).
          </li>
          <li>
            <b>Debt side:</b> deflate the asset and borrow far more of it than the collateral supports. The exposure is that
            reserve&rsquo;s own available liquidity.
          </li>
        </ul>

        <h3>Tiers</h3>
        <p>Each side of each reserve is compared as exposure ÷ cost, and a pool takes the worst of its reserves.</p>
        <table>
          <tbody>
            {TIER_ORDER.map((t) => (
              <tr key={t}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <TierBadge tier={t} />
                </td>
                <td>{TIER_MEANING[t]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          A market that trades under $1,000 a day with more than $10,000 exposed is critical whatever the order book looks
          like, because a book that thin can be rebuilt by anyone.
        </p>

        <h3>What it leaves out</h3>
        <ul>
          <li>
            <b>Cost is capital, not loss.</b> The attacker keeps the asset they buy. The tiers say who could try, not what they
            would lose.
          </li>
          <li>
            <b>AMM liquidity is not modelled.</b> Liquidity pools cannot print a manipulated trade but can absorb one, so the
            cost shown is, if anything, too low.
          </li>
          <li>
            <b>Off-DEX prices are not scored.</b> Exchange-based and admin-run feeds cannot be moved by a trade on the Stellar
            DEX. Their risks are different: a compromised key, or an upstream failure.
          </li>
          <li>
            <b>Fixed-price collateral</b> is flagged, not scored: a depeg of an asset the pool prices at exactly $1 is
            invisible to the pool.
          </li>
          <li>
            <b>Pool discovery is incomplete.</b> Pools are found through backstop reward zones and recent deployments, so an
            older, unlisted pool can be missing.
          </li>
        </ul>

        <h3>Further reading</h3>
        <p>
          The scanner is open source: <a href={BACKEND}>damper-backend</a>. The reasoning behind the scoring is in{' '}
          <a href={`${BACKEND}/blob/main/docs/adr/0002-score-by-capital-to-clear-the-book.md`}>decision record 0002</a>, and
          the oracle that defends against these attacks is <a href="https://github.com/Dampper/damper-contracts">damper-contracts</a>.
        </p>
      </div>
    </div>
  );
}
