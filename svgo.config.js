// SVGO config for optimizing the "Heads" slice assets.
// Goal: strip Adobe XMP / C2PA provenance metadata and editor cruft to shrink
// file size, while PRESERVING viewBox (reels rely on it) and the ids/styles
// each slice uses to render. Pristine originals live in assets/_originals/.
module.exports = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // Reels scale slices via CSS; viewBox must stay so they render.
          removeViewBox: false,
          // Slices use <style> class selectors (.cls-1 etc.) keyed to ids —
          // do not rename/collapse ids or the styling breaks.
          cleanupIds: false,
        },
      },
    },
    // Strip the heavy Adobe XMP <metadata> block (and C2PA where present).
    'removeMetadata',
    // Remove <?xpacket ...?> and other processing instructions.
    'removeXMLProcInst',
    { name: 'removeComments', params: { preservePatterns: false } },
    'removeDimensions', // keep viewBox as the single source of aspect
  ],
};
