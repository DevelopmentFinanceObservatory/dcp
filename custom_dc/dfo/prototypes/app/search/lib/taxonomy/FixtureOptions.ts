/**
 * FixtureOptions — a hand-built, hardcoded taxonomy keyed by shape + slot
 * (axis:label), offering a few concrete values plus an "all …" (unbound)
 * choice per slot.
 *
 * TEST DATA ONLY: no runtime code uses this any more (SearchClient reads
 * slot options straight from the engine via optionsFromSpec, and renders an
 * honest empty list — never a fabricated one — when the spec carries none).
 * Kept as a convenient source of realistic SlotOption[] fixtures for
 * component tests (e.g. PhrasePopover.test.tsx).
 */

import type { SlotKey, SlotValue } from '@/lib/contract/types';
import type { SlotOption, SlotOptionsProvider } from './SlotOptionsProvider';

const ref = (dcid: string, label: string) => ({ dcid, label });

const value = (v: SlotValue, label: string, count?: number): SlotOption => ({
  label,
  binding: { kind: 'value', value: v },
  count,
});

const entity = (dcid: string, label: string, count?: number): SlotOption =>
  value({ value_kind: 'entity', ref: ref(dcid, label) }, label, count);

const enumValue = (dcid: string, label: string, count?: number): SlotOption =>
  value({ value_kind: 'enum_value', ref: ref(dcid, label) }, label, count);

const unbound = (label: string): SlotOption => ({ label, binding: { kind: 'unbound' } });

/** shapeId → "axis:label" → options. Counts are illustrative observation footprints. */
const TABLE: Record<string, Record<string, SlotOption[]>> = {
  'shape/development_finance_flows': {
    'what:flow': [
      enumValue('ODAGrants', 'ODA grants', 5840),
      enumValue('ODALoans', 'ODA loans', 1230),
      enumValue('ODA', 'ODA', 7060),
      unbound('all flows'),
    ],
    'how:purpose': [
      enumValue('MalariaControl', 'malaria control', 420),
      enumValue('Education', 'education', 1320),
      enumValue('HealthGeneral', 'health', 2240),
      unbound('all purposes'),
    ],
    'how:channel': [
      enumValue('Bilateral', 'bilateral', 4200),
      enumValue('Multilateral', 'multilateral', 1900),
      enumValue('NGO', 'NGOs', 760),
      unbound('all channels'),
    ],
    // A long list on purpose — exercises the popover's filter + scroll.
    'where:recipient': [
      entity('country/ETH', 'Ethiopia', 186),
      entity('country/KEN', 'Kenya', 205),
      entity('country/NGA', 'Nigeria', 320),
      entity('country/TZA', 'Tanzania', 240),
      entity('country/UGA', 'Uganda', 198),
      entity('country/GHA', 'Ghana', 176),
      entity('country/RWA', 'Rwanda', 132),
      entity('country/COD', 'DR Congo', 210),
      entity('country/SEN', 'Senegal', 120),
      entity('country/MOZ', 'Mozambique', 150),
      entity('country/MWI', 'Malawi', 110),
      entity('country/ZMB', 'Zambia', 128),
      entity('country/MLI', 'Mali', 105),
      entity('country/BFA', 'Burkina Faso', 98),
      entity('country/CIV', "Côte d'Ivoire", 140),
      entity('country/BGD', 'Bangladesh', 260),
      entity('country/IND', 'India', 410),
      entity('africa', 'Sub-Saharan Africa', 5840),
      entity('LowIncomeCountries', 'Low-income countries', 3200),
      unbound('all recipients'),
    ],
    'where:donor': [
      entity('country/FRA', 'France', 540),
      entity('country/USA', 'United States', 980),
      entity('country/DEU', 'Germany', 610),
      unbound('all donors'),
    ],
    'source:source': [
      enumValue('dc/base/OECD_CRS', 'OECD CRS', 8400),
      enumValue('dc/base/WorldBank', 'World Bank', 3100),
      unbound('all sources'),
    ],
  },
  'shape/person_count': {
    'how:gender': [
      enumValue('Female', 'female', 14),
      enumValue('Male', 'male', 14),
      unbound('all people'),
    ],
    'where:place': [
      entity('country/KEN', 'Kenya', 205),
      entity('country/ETH', 'Ethiopia', 186),
      entity('country/NGA', 'Nigeria', 320),
      unbound('all places'),
    ],
  },
};

export class FixtureOptions implements SlotOptionsProvider {
  optionsFor(shapeId: string, slot: SlotKey): SlotOption[] {
    return TABLE[shapeId]?.[`${slot.axis}:${slot.label}`] ?? [];
  }
}

export const fixtureOptions = new FixtureOptions();
