import * as fc from 'fast-check';
import { getTour } from './tours';

describe('Tour lib property tests', () => {
  // Feature: rentvision-platform, Property 7: Tour scene structure completeness
  it('Property 7: every scene has non-empty id, title, imageUrl and all hotspots have pitch, yaw, text', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (listingId) => {
        const { scenes } = getTour(listingId);

        expect(scenes.length).toBeGreaterThan(0);

        for (const scene of scenes) {
          expect(scene.id).toBeTruthy();
          expect(scene.title).toBeTruthy();
          expect(scene.imageUrl).toBeTruthy();

          for (const hotspot of scene.hotspots) {
            expect(typeof hotspot.pitch).toBe('number');
            expect(typeof hotspot.yaw).toBe('number');
            expect(hotspot.text).toBeTruthy();
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
