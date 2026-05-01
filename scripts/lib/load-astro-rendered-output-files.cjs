'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REL_PARTS = ['src', 'data', 'site', 'astro-rendered-output-files.json'];

function astroRenderedManifestPath(root) {
  return path.join(root, ...REL_PARTS);
}

/**
 * @returns {Set<string>}
 */
function loadAstroRenderedOutputFilesSet(root) {
  const manifestPath = astroRenderedManifestPath(root);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing Astro rendered manifest: ${manifestPath}`);
  }
  const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const list = data.outputFiles;
  if (!Array.isArray(list) || list.some((x) => typeof x !== 'string')) {
    throw new Error(`${manifestPath}: expected outputFiles string array`);
  }
  return new Set(list);
}

module.exports = {
  astroRenderedManifestPath,
  loadAstroRenderedOutputFilesSet,
};
