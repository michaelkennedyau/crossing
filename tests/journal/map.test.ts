import { describe, expect, it } from 'vitest';
import { renderChapterMap } from '../../src/journal/render-map';

describe('journal · chapter maps', () => {
  it('a sea chapter draws coast, ring, draw-in leg, and its port label — and no NaN', () => {
    const svg = renderChapterMap('ch06-calvi');
    expect(svg).toContain('CALVI');
    expect(svg).toContain('pathLength="1"');
    expect(svg).toContain('class="m-draw"');
    expect(svg).toContain('r="6.5"');                    // the focus ring
    expect(svg).toContain('stroke-dasharray="3 5"');     // full-route underlay
    expect(svg).not.toContain('NaN');
    expect(svg).toContain('by sea');
  });

  it('a land chapter uses the rail diagram: no coast paths, rail caption', () => {
    const svg = renderChapterMap('ch02-lyon-caught-us', 'lyon');
    expect(svg).toContain('LYON');
    expect(svg).toContain('by rail');
    expect(svg).not.toContain('M545.0');                 // med coast's first path absent
    expect(svg).not.toContain('NaN');
  });

  it('no resolvable focus renders the graceful full-route overview', () => {
    const svg = renderChapterMap('ch12-at-sea');
    expect(svg).toContain('the route, entire');
    expect(svg).not.toContain('m-draw');
    expect(svg).not.toContain('NaN');
  });

  it('a leg arg focuses the leg itself (the sea day)', () => {
    const svg = renderChapterMap('ch12-at-sea', 'porto-ercole--lipari');
    expect(svg).toContain('porto ercole → lipari');
    expect(svg).toContain('m-draw');
  });

  it('the overview variant carries anchors, no per-port labels, and honest progress', () => {
    const svg = renderChapterMap(null, undefined, 'overview', 'portoferraio');
    expect(svg).toContain('spine-map');
    expect(svg).toContain('NICE');
    expect(svg).toContain('VALLETTA');
    expect(svg).not.toContain('SAINT-FLORENT');          // no per-port labels at this scale
    expect((svg.match(/stroke-width="3"/g) ?? []).length).toBeGreaterThanOrEqual(3); // done legs drawn solid
    expect(svg).not.toContain('NaN');
  });

  it('london: ring only, no arriving leg', () => {
    const svg = renderChapterMap('ch00-two-pints', 'london');
    expect(svg).toContain('LONDON');
    expect(svg).toContain('where it begins');
    expect(svg).not.toContain('m-draw');
  });
});
