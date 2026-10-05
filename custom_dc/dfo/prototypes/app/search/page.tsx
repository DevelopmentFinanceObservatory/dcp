/**
 * /prototype/search — the Sentence Search surface.
 *
 * Server-component wrapper around the client surface. State lives in the
 * specStore in memory; there is no URL permalink to hydrate from or share.
 */

import type { Metadata } from 'next';
import SearchClient from './SearchClient';

export const metadata: Metadata = { title: 'DC Sentence Search' };

export default function SearchPage() {
  return <SearchClient />;
}
