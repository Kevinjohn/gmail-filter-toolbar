import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';

export function writeFileBatch(entries, { rename = renameSync } = {}) {
  const files = entries.map(([file]) => file);
  if (new Set(files).size !== files.length) {
    throw new TypeError('writeFileBatch entries must have unique destination paths');
  }

  const suffix = `${process.pid}-${randomUUID()}`;
  const staged = entries.map(([file, contents]) => ({
    file,
    contents,
    mode: statSync(file).mode,
    temporary: `${file}.tmp-${suffix}`,
    backup: `${file}.bak-${suffix}`,
  }));

  try {
    for (const entry of staged) {
      writeFileSync(entry.temporary, entry.contents);
      chmodSync(entry.temporary, entry.mode);
    }
    for (const entry of staged) {
      rename(entry.file, entry.backup);
      rename(entry.temporary, entry.file);
    }
  } catch (error) {
    for (const entry of staged) {
      rmSync(entry.temporary, { force: true });
      if (existsSync(entry.backup)) {
        rmSync(entry.file, { force: true });
        rename(entry.backup, entry.file);
      }
    }
    throw error;
  }

  for (const entry of staged) rmSync(entry.backup, { force: true });
}
