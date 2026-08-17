import { afterEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { repositoryRoot } from '@/lib/repository-root';

describe('ADS_REPO_ROOT repository root resolution', () => {
  const original = process.env.ADS_REPO_ROOT;
  afterEach(() => {
    if (original === undefined) delete process.env.ADS_REPO_ROOT;
    else process.env.ADS_REPO_ROOT = original;
  });

  it('resolves two directories above CWD when ADS_REPO_ROOT is unset', () => {
    delete process.env.ADS_REPO_ROOT;
    expect(repositoryRoot()).toBe(path.resolve(process.cwd(), '..', '..'));
  });

  it('honors an absolute ADS_REPO_ROOT override', () => {
    process.env.ADS_REPO_ROOT = path.resolve(process.cwd(), '..', '..');
    expect(repositoryRoot()).toBe(path.resolve(process.cwd(), '..', '..'));
  });

  it('resolves a relative ADS_REPO_ROOT against the process CWD', () => {
    process.env.ADS_REPO_ROOT = '../..';
    expect(repositoryRoot()).toBe(path.resolve(process.cwd(), '..', '..'));
  });

  it('ignores a whitespace-only ADS_REPO_ROOT', () => {
    process.env.ADS_REPO_ROOT = '   ';
    expect(repositoryRoot()).toBe(path.resolve(process.cwd(), '..', '..'));
  });
});
