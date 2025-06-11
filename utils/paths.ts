/**
 * Resolves a path relative to the project root if it's not absolute
 * @param path The path to resolve
 * @returns The resolved absolute path
 */
export function resolvePath(path: string): string {
  if (!path) {
    return Deno.cwd();
  }
  if (path.startsWith('/')) {
    return path;
  }
  // Remove any quotes that might be in the path
  path = path.replace(/['"]/g, '');
  // Handle relative paths using URL resolution
  const basePath = Deno.cwd();
  const resolvedPath = new URL(path, `file://${basePath}/`).pathname;
  return resolvedPath;
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param path The directory path to ensure exists
 */
export async function ensureDir(path: string): Promise<void> {
  try {
    await Deno.stat(path);
  } catch {
    await Deno.mkdir(path, { recursive: true });
  }
} 