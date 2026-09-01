export type AssetContent = {
  path: string;
  contents: string;
};

const LFS_POINTER_PATTERN =
  /^version https:\/\/git-lfs\.github\.com\/spec\/v1\r?\noid sha256:[0-9a-f]{64}\r?\nsize [0-9]+\r?\n?$/;

function isLfsPointer(contents: string): boolean {
  return LFS_POINTER_PATTERN.test(contents);
}

export function findLfsPointerAssets(files: Iterable<AssetContent>): string[] {
  return Array.from(files)
    .filter(({ contents }) => isLfsPointer(contents))
    .map(({ path }) => path);
}
