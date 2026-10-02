import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ensureMuseDataDirSafe } from "../src/msp/data-home.js";

describe("Muse data directory safety", () => {
  let root: string;
  let dataHome: string;
  let museDir: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "bb-muse-data-"));
    dataHome = join(root, "share");
    museDir = join(dataHome, "muse");
    mkdirSync(museDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("removes group and world write access that Muse rejects", async () => {
    chmodSync(museDir, 0o777);

    await ensureMuseDataDirSafe({ XDG_DATA_HOME: dataHome });

    expect(lstatSync(museDir).mode & 0o777).toBe(0o755);
  });

  it("preserves stricter owner-only permissions", async () => {
    chmodSync(museDir, 0o700);

    await ensureMuseDataDirSafe({ XDG_DATA_HOME: dataHome });

    expect(lstatSync(museDir).mode & 0o777).toBe(0o700);
  });

  it("leaves a missing data directory for Muse to create", async () => {
    rmSync(museDir, { recursive: true });

    await expect(
      ensureMuseDataDirSafe({ XDG_DATA_HOME: dataHome }),
    ).resolves.toBeUndefined();
  });

  it("refuses to follow a linked data directory", async () => {
    rmSync(museDir, { recursive: true });
    const target = join(root, "target");
    mkdirSync(target);
    symlinkSync(target, museDir);

    await expect(
      ensureMuseDataDirSafe({ XDG_DATA_HOME: dataHome }),
    ).rejects.toThrow("must be a real directory");
    expect(lstatSync(target).mode & 0o777).toBe(0o755);
  });
});
