import { fs, path } from "../cep/node";

export function findGitRoot(projectRoot?: string): string | undefined {
  if (!projectRoot || !fs) return undefined;

  let currentDir = projectRoot;
  while (currentDir) {
    try {
      fs.accessSync(path.join(currentDir, ".git"));
      return currentDir;
    } catch {}

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return undefined;
    }
    currentDir = parentDir;
  }

  return undefined;
}

