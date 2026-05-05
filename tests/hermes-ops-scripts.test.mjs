import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, statSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const executable = (relativePath) => {
  const mode = statSync(new URL(`../${relativePath}`, import.meta.url)).mode;
  return (mode & 0o111) !== 0;
};

test("migration scripts use dry-run and backups before mutating services", () => {
  const migrate = read("ops/hermes/scripts/migrate-openclaw-to-hermes.sh");
  const cutover = read("ops/hermes/scripts/cutover-to-hermes.sh");

  assert.match(migrate, /hermes claw migrate.*--dry-run/);
  assert.match(migrate, /tar .*\.openclaw/);
  assert.match(migrate, /--preset full --migrate-secrets/);
  assert.match(cutover, /systemctl stop openclaw/);
  assert.match(cutover, /hermes gateway start|systemctl --user start hermes-gateway/);
});

test("remove script archives OpenClaw before disabling and deleting", () => {
  const source = read("ops/hermes/scripts/remove-openclaw-after-cutover.sh");

  assert.match(source, /tar .*openclaw-final/);
  assert.match(source, /systemctl disable openclaw/);
  assert.match(source, /rm -rf .*\.openclaw/);
  assert.match(source, /I_UNDERSTAND_OPENCLAW_REMOVAL/);
});

test("operator scripts are executable", () => {
  for (const script of [
    "ops/hermes/scripts/preflight.sh",
    "ops/hermes/scripts/migrate-openclaw-to-hermes.sh",
    "ops/hermes/scripts/cutover-to-hermes.sh",
    "ops/hermes/scripts/remove-openclaw-after-cutover.sh",
    "ops/hermes/scripts/install-perpuskukaan-skill.sh",
  ]) {
    assert.equal(executable(script), true, `${script} should be executable`);
  }
});
