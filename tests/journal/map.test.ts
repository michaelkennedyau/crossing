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

  it('a land chapter gets the station strip: 110-tall, no coast, rail caption', () => {
    const svg = renderChapterMap('ch02-lyon-caught-us', 'lyon');
    expect(svg).toContain('jmap-rail');
    expect(svg).toContain('viewBox="0 0 560 110"');
    expect(svg).toContain('LYON');
    expect(svg).toContain('by rail');
    expect(svg).not.toContain('M545.0');                 // med coast absent
    expect(svg).not.toContain('NaN');
  });

  it("'nice' gets the Med plate ringed with no arriving leg — the sea begins, no train diagram", () => {
    const svg = renderChapterMap('ch05-the-last-berth', 'nice');
    expect(svg).not.toContain('jmap-rail');
    expect(svg).toContain('NICE');
    expect(svg).toContain('where it begins');
    expect(svg).not.toContain('m-draw');
  });

  it('the overview crops to the sea route and VALLETTA survives the frame', () => {
    const svg = renderChapterMap(null, undefined, 'overview', 'portoferraio');
    expect(svg).not.toContain('viewBox="0 0 560 620"');  // cropped, not the full plate
    expect(svg).toContain('VALLETTA');
    expect(svg).toContain('text-anchor="end"');          // the edge-safe anchor flip
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

  it('london: the strip, ringed at the start, no draw-in', () => {
    const svg = renderChapterMap('ch00-two-pints', 'london');
    expect(svg).toContain('jmap-rail');
    expect(svg).toContain('LONDON');
    expect(svg).toContain('where it begins');
    expect(svg).not.toContain('m-draw');
  });
});
