# Icon maintenance

The editable extension icon is `src/assets/icon-source.svg`. The browser manifests use PNG copies
at 16, 32, 48, and 128 pixels from `src/icons/`.

To regenerate the PNGs with ImageMagick 7:

```bash
for size in 16 32 48 128; do
  magick -background none src/assets/icon-source.svg -resize "${size}x${size}" \
    "PNG32:src/icons/icon${size}.png"
done
```

Inspect the 16-pixel and 128-pixel results before accepting them. Then update the corresponding
SHA-256 values in `scripts/build-release.mjs`, run `pnpm run build`, and finish with
`pnpm run release:build`. The release verifier rejects an archive whose PNG bytes do not match the
reviewed hashes.
