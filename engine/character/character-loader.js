const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

class CharacterLoader {
  load(manifestPath) {
    const absoluteManifestPath = path.resolve(__dirname, '..', '..', manifestPath);
    const manifestDir = path.dirname(absoluteManifestPath);
    const manifest = JSON.parse(fs.readFileSync(absoluteManifestPath, 'utf8'));

    return {
      ...manifest,
      poses: this.resolveMap(manifest.poses, manifestDir),
      animations: this.resolveAnimations(manifest.animations, manifestDir)
    };
  }

  resolveMap(entries, manifestDir) {
    return Object.fromEntries(
      Object.entries(entries || {}).map(([key, value]) => [key, this.toFileUrl(manifestDir, value)])
    );
  }

  resolveAnimations(animations, manifestDir) {
    const resolved = {};

    Object.entries(animations || {}).forEach(([name, animation]) => {
      resolved[name] = {
        ...animation,
        frames: (animation.frames || []).map(frame => this.toFileUrl(manifestDir, frame))
      };
    });

    return resolved;
  }

  toFileUrl(manifestDir, relativePath) {
    return pathToFileURL(path.resolve(manifestDir, relativePath)).href;
  }
}

module.exports = new CharacterLoader();
