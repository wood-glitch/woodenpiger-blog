/* Cover resolution, missing-file checks and build-time warnings.
 *
 * Design note: this hook deliberately does NOT mutate post fields.
 * Hexo persists model changes into db.json, so clearing a field here would
 * make it stay empty even after the cover file is delivered later.
 * Templates call `resolveCover()` instead, which yields the same rendered
 * result (no <img> for a missing file, no 404) without caching side effects.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const warned = new Set();

function sourceRoot(hexo) {
  return path.join(hexo.base_dir, hexo.config.source_dir || "source");
}

function isRemote(value) {
  return /^(https?:)?\/\//i.test(String(value || ""));
}

function localPathOf(hexo, value) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  const clean = decodeURIComponent(value.split("?")[0].split("#")[0]).replace(/^\/+/, "");
  return path.join(sourceRoot(hexo), clean);
}

function fileExists(hexo, value) {
  const file = localPathOf(hexo, value);
  if (!file) return null;
  return fs.existsSync(file);
}

/* true / false for local absolute paths, null when it cannot be verified */
hexo.extend.helper.register("hasLocalAsset", function (value) {
  return fileExists(hexo, value);
});

/* cover -> banner -> thumbnail, skipping missing local files */
hexo.extend.helper.register("resolveCover", function (post) {
  if (!post || post.thumbnail === false) return null;
  const candidates = [post.cover, post.banner, post.thumbnail];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || candidate.length === 0) continue;
    if (isRemote(candidate)) return candidate;
    if (!candidate.startsWith("/")) return candidate; // post-asset relative path: trust it
    if (fileExists(hexo, candidate) === true) return candidate;
  }
  return null;
});

hexo.extend.filter.register("before_post_render", function (data) {
  ["cover", "banner", "thumbnail"].forEach((field) => {
    const value = data[field];
    if (typeof value !== "string" || !value.startsWith("/")) return;
    if (fileExists(hexo, value) !== false) return;
    const key = `${data.source || data.title}:${field}`;
    if (warned.has(key)) return;
    warned.add(key);
    hexo.log.warn(`[cover] ${field} not found: ${value} (${data.source || data.title})`);
  });
  return data;
});
let bannerChecked = false;

hexo.extend.filter.register("before_generate", function () {
  if (bannerChecked) return;
  bannerChecked = true;

  const bannerImage = (hexo.theme.config.home_banner || {}).image || {};
  ["light", "dark"].forEach((mode) => {
    const value = bannerImage[mode];
    if (typeof value !== "string" || !value.startsWith("/")) return;
    if (fileExists(hexo, value) === false) {
      hexo.log.warn(`[cover] home banner ${mode} not found: ${value} (no banner background will be shown)`);
    }
  });
});