/**
 * Vitest global setup.
 *
 * - Extends `expect` with jest-dom matchers (toBeInTheDocument, etc.).
 * - Unmounts React trees between tests. Guarded by a DOM check so it is a no-op in
 *   node-environment tests (the pure-logic suites), which have no `document`.
 *
 * Component tests opt into jsdom per file with `// @vitest-environment jsdom`;
 * pure-logic tests stay on the faster default node environment.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

if (typeof document !== 'undefined') {
  afterEach(() => cleanup());
}
