import { describe, it, expect } from 'vitest';
import { humanizeSourceLabel } from './humanizeSourceLabel';

describe('humanizeSourceLabel', () => {
  it('spaces out a bare PascalCase identifier', () => {
    expect(humanizeSourceLabel('WorldDevelopmentIndicators')).toBe('World Development Indicators');
  });

  it('splits an underscore-separated identifier into words', () => {
    expect(humanizeSourceLabel('Kenya_Census')).toBe('Kenya Census');
  });

  it('leaves an all-caps acronym untouched', () => {
    expect(humanizeSourceLabel('CRS')).toBe('CRS');
    expect(humanizeSourceLabel('WDI')).toBe('WDI');
  });

  // Matches the engine's actual _camel_to_words boundary rule: it only splits
  // at a lowercase/digit-to-uppercase boundary, so an acronym run immediately
  // followed by a capitalized word has no such boundary to split on and stays
  // fused. This differs from a "smart" acronym splitter -- deliberately, so
  // this stays byte-identical to what render.py renders in the sentence chip.
  it('does not split an acronym fused directly onto a capitalized word', () => {
    expect(humanizeSourceLabel('CRSData')).toBe('CRSData');
  });

  it('splits each underscore segment independently, so a mixed label spaces both halves correctly', () => {
    expect(humanizeSourceLabel('WorldBank_WDI')).toBe('World Bank WDI');
  });

  it('passes already-spaced prose through unchanged', () => {
    expect(humanizeSourceLabel('World Bank')).toBe('World Bank');
  });

  it('passes a single lowercase word through unchanged', () => {
    expect(humanizeSourceLabel('eurostat')).toBe('eurostat');
  });

  it('passes a single already-capitalized word through unchanged (no boundary to split)', () => {
    expect(humanizeSourceLabel('Eurostat')).toBe('Eurostat');
  });

  it('handles an empty string as a no-op', () => {
    expect(humanizeSourceLabel('')).toBe('');
  });
});
