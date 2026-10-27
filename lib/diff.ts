// Indexes of the lines in `edited` that differ from the original line in the
// same position, which covers both reordered and hand-edited lines.
export function changedLines(original: string, edited: string): Set<number> {
  const before = original.split("\n");
  const changed = new Set<number>();
  edited.split("\n").forEach((line, i) => {
    if (line.trim() && line !== before[i]) changed.add(i);
  });
  return changed;
}
