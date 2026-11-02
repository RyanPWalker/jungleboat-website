"""Resize and compress photos for the website.

Usage:
    pip install pillow
    python scripts/compress_images.py images-src public/images

Every JPG/PNG/WebP in the source folder becomes a WebP in the output folder,
at most 2000px wide, quality 80. The source folder is gitignored, so
originals stay out of the repo.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

MAX_SIZE = 2000
QUALITY = 80
EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def main(src: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for path in sorted(src.iterdir()):
        if path.suffix.lower() not in EXTS:
            continue
        with Image.open(path) as im:
            im = ImageOps.exif_transpose(im)  # respect phone rotation
            im.thumbnail((MAX_SIZE, MAX_SIZE))
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGB")
            dest = out / (path.stem.lower().replace(" ", "-") + ".webp")
            im.save(dest, "WEBP", quality=QUALITY, method=6)
        before, after = path.stat().st_size, dest.stat().st_size
        print(f"{path.name}: {before // 1024} KB -> {dest.name}: {after // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(Path(sys.argv[1]), Path(sys.argv[2]))
