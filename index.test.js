// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const directory = dirname(fileURLToPath(import.meta.url));
const index = readFileSync(resolve(directory, 'index.html'), 'utf8');
const document = new DOMParser().parseFromString(index, 'text/html');
const readPublic = path => readFileSync(resolve(directory, `public${path}`));

it('declares standalone installation covering all routes and preserves the saved launch page', () => {
  const link = document.querySelector('link[rel="manifest"]');
  expect(link).not.toBeNull();
  const manifest = JSON.parse(readPublic(link.getAttribute('href')).toString());
  expect(manifest.display).toBe('standalone');
  expect(manifest.scope).toBe('/');
  expect(manifest.start_url).toBeUndefined();
});

it('links PNG home screen icons with the declared dimensions', () => {
  const touchIcon = document.querySelector('link[rel="apple-touch-icon"]');
  expect(touchIcon).not.toBeNull();
  const manifest = JSON.parse(readPublic(document.querySelector('link[rel="manifest"]').getAttribute('href')).toString());
  const icons = manifest.icons.filter(icon => icon.type === 'image/png');
  expect(icons.map(icon => icon.sizes)).toEqual(['192x192', '512x512']);
  for (const icon of [...icons, { src: touchIcon.getAttribute('href'), sizes: touchIcon.getAttribute('sizes') }]) {
    const bytes = readPublic(icon.src);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`).toBe(icon.sizes);
  }
});
