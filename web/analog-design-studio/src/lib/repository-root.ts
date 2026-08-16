import path from 'node:path';

/**
 * Single authority for resolving the cadence-virtuoso-skill repository root.
 *
 * Resolution order:
 *   1. ADS_REPO_ROOT environment variable (absolute or relative to CWD)
 *   2. Fallback for the standard checkout layout: the Next.js working
 *      directory is web/analog-design-studio, so the repository root is
 *      two levels up.
 *
 * Never hardcode machine-specific absolute paths here.
 */
export function repositoryRoot(): string {
  const configured = process.env.ADS_REPO_ROOT;
  if (configured && configured.trim()) return path.resolve(configured.trim());
  return path.resolve(process.cwd(), '..', '..');
}
