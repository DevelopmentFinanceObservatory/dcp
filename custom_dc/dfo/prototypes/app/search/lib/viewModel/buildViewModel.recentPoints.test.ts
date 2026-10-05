import { describe, it, expect } from 'vitest';
import { buildViewModel } from './buildViewModel';
import { definiteBreadthSpec, definiteExactSpec, definiteCompareSpec } from '../fixtures';
import type { Spec } from '@/lib/contract/types';

describe('buildViewModel — table.recentPoints', () => {
  it('single-series spec: newest-first points, labels via the same resolution chain as table rows', () => {
    const vm = buildViewModel(definiteBreadthSpec);
    const recent = vm.table.recentPoints;
    expect(recent).toBeTruthy();
    expect(recent!.points.map((p) => p.date)).toEqual(['2024', '2023', '2022', '2021', '2020']);
    expect(recent!.shownCount).toBe(5);
    expect(recent!.totalObs).toBe(270);
    expect(recent!.variable).toBe('Malaria control ODA grants (Ethiopia)');
    expect(recent!.entity).toBe('United States'); // donor-keyed series, via entity_label
  });

  it('formats point values the same way as table rows (toLocaleString)', () => {
    const recent = buildViewModel(definiteBreadthSpec).table.recentPoints!;
    expect(recent.points[0].value).toBe(
      (24_607_887.18).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    );
  });

  it('caps at 8 points even when the series ships more', () => {
    const manyPoints = Array.from({ length: 10 }, (_, i) => ({ date: `${2015 + i}`, value: i * 1000 }));
    const specWithManyPoints: Spec = {
      ...definiteBreadthSpec,
      observations: {
        ...definiteBreadthSpec.observations!,
        series: [{ ...definiteBreadthSpec.observations!.series[0], points: manyPoints }],
      },
    };
    const recent = buildViewModel(specWithManyPoints).table.recentPoints!;
    expect(recent.points).toHaveLength(8);
    expect(recent.shownCount).toBe(8);
    expect(recent.points[0].date).toBe('2024'); // newest of the 10 shown first
    expect(recent.points[7].date).toBe('2017');
  });

  it('carries a null point value through as null', () => {
    const specWithGap: Spec = {
      ...definiteExactSpec,
      observations: {
        ...definiteExactSpec.observations!,
        series: [{ ...definiteExactSpec.observations!.series[0], points: [{ date: '2023', value: null }] }],
      },
    };
    const recent = buildViewModel(specWithGap).table.recentPoints!;
    expect(recent.points[0]).toEqual({ date: '2023', value: null });
  });

  it('is null for a multi-series spec', () => {
    expect(buildViewModel(definiteCompareSpec).table.recentPoints).toBeFalsy();
  });

  it('is null when the spec carries no observations', () => {
    const vm = buildViewModel({ ...definiteExactSpec, observations: undefined });
    expect(vm.table.recentPoints).toBeFalsy();
  });

  it('is null when observations.series is empty', () => {
    const vm = buildViewModel({
      ...definiteExactSpec,
      observations: { series: [], total_obs: 0, complete: true },
    });
    expect(vm.table.recentPoints).toBeFalsy();
  });
});
