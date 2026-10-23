/**
 * humanizeSourceLabel — normalize a raw provenance/import identifier for
 * source-axis display text. Ports the engine's own rule
 * (the apis repo's src/search/render/labels.py `_humanize_source_label` /
 * `_camel_to_words`) verbatim so a bound source chip (rendered by the engine)
 * and this frontend's source popover options (built from the same raw labels
 * via `optionsFromSpec`'s resolved_sources fallback) never disagree on
 * wording.
 *
 * A raw "name" arc can be underscore_separated ("Kenya_Census"), bare
 * camelCase ("WorldDevelopmentIndicators"), or a mix of both
 * ("WorldBank_WDI"). Splitting on "_" (only when the whole string IS a bare
 * underscore-separated identifier -- real prose with an incidental
 * underscore never matches) and running camelToWords per segment before
 * rejoining handles all three shapes uniformly, same as the engine.
 */

// A bare underscore_separated identifier, end to end -- anchored full-string
// so it only fires on text that IS the identifier, never on real prose that
// happens to contain an underscore.
const UNDERSCORE_IDENTIFIER = /^[A-Za-z0-9]+(?:_[A-Za-z0-9]+)+$/;

// A bare camelCase/PascalCase identifier, end to end -- no spaces or
// underscores allowed, so this never fires on already-spaced prose.
const BARE_ALNUM_IDENTIFIER = /^[A-Za-z0-9]+$/;
const LOWER_UPPER_BOUNDARY = /(?<=[a-z0-9])(?=[A-Z])/;
const LOWER_UPPER_BOUNDARY_GLOBAL = /(?<=[a-z0-9])(?=[A-Z])/g;

/**
 * Space out a bare camelCase/PascalCase identifier; pass everything else
 * through. Only splits at a lowercase/digit-to-uppercase boundary -- an
 * all-caps acronym run ("CRS", "WDI") has none, so it stays intact even when
 * immediately followed by a capitalized word ("CRSData" stays "CRSData",
 * matching the engine exactly -- there's no lowercase/digit right before the
 * split point to anchor on, unlike the general-purpose camel-boundary regex
 * used elsewhere in the engine for raw-dcid fallback labels).
 */
function camelToWords(text: string): string {
  if (!BARE_ALNUM_IDENTIFIER.test(text)) return text;
  if (!LOWER_UPPER_BOUNDARY.test(text)) return text;
  return text.replace(LOWER_UPPER_BOUNDARY_GLOBAL, ' ');
}

export function humanizeSourceLabel(text: string): string {
  if (UNDERSCORE_IDENTIFIER.test(text)) {
    return text.split('_').map(camelToWords).join(' ');
  }
  return camelToWords(text);
}
