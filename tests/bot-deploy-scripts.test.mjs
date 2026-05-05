import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, statSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const executable = (relativePath) => {
  const mode = statSync(new URL(`../${relativePath}`, import.meta.url)).mode;
  return (mode & 0o111) !== 0;
};

// ops/bot-layer/deploy-vm.sh exists and is executable
test("deploy-vm.sh exists", () => {
  const content = read("ops/bot-layer/deploy-vm.sh");
  assert.ok(content.length > 0, "deploy-vm.sh should not be empty");
});

test("deploy-vm.sh is executable", () => {
  assert.ok(executable("ops/bot-layer/deploy-vm.sh"), "deploy-vm.sh should be executable");
});

test("deploy-vm.sh has safety guards", () => {
  const content = read("ops/bot-layer/deploy-vm.sh");
  assert.ok(content.includes("set -euo pipefail"), "should use strict mode");
  assert.ok(content.includes("rsync"), "should use rsync");
  assert.ok(content.includes("systemctl restart"), "should restart service");
});

test("deploy-vm.sh preserves remote environment secrets", () => {
  const content = read("ops/bot-layer/deploy-vm.sh");
  assert.ok(content.includes("--exclude '.env.production'"), "should not overwrite remote env");
  assert.ok(content.includes("ensure_remote_env"), "should verify remote env after sync");
});

test("deploy-vm.sh loads remote shell profile before package commands", () => {
  const content = read("ops/bot-layer/deploy-vm.sh");
  assert.ok(content.includes("source ~/.profile"), "should load pnpm/corepack PATH on VM");
});

test("deploy-vm.sh does NOT set Telegram webhook", () => {
  const content = read("ops/bot-layer/deploy-vm.sh");
  assert.ok(!content.includes("setWebhook"), "should not call setWebhook");
  assert.ok(!content.includes("TELEGRAM_BOT_TOKEN"), "should not reference Telegram token");
});

test("deploy-vm.sh does NOT stop OpenClaw", () => {
  const content = read("ops/bot-layer/deploy-vm.sh");
  assert.ok(!content.includes("stop openclaw"), "should not stop OpenClaw");
  assert.ok(!content.includes("openclaw"), "should not reference OpenClaw");
});

// systemd service file
test("perpuskukaan-web.service exists", () => {
  const content = read("ops/bot-layer/perpuskukaan-web.service");
  assert.ok(content.length > 0, "service file should not be empty");
});

test("service listens on port 3001", () => {
  const content = read("ops/bot-layer/perpuskukaan-web.service");
  assert.ok(content.includes("3001"), "should use port 3001");
});

test("service binds to localhost only", () => {
  const content = read("ops/bot-layer/perpuskukaan-web.service");
  assert.ok(content.includes("127.0.0.1"), "should bind to 127.0.0.1 only");
});

test("service runs as non-root user", () => {
  const content = read("ops/bot-layer/perpuskukaan-web.service");
  assert.ok(content.includes("User=exedev"), "should run as exedev user");
});

test("service has security hardening", () => {
  const content = read("ops/bot-layer/perpuskukaan-web.service");
  assert.ok(content.includes("NoNewPrivileges=true"), "should have NoNewPrivileges");
  assert.ok(content.includes("Restart=always"), "should auto-restart");
});

// README
test("README.md exists", () => {
  const content = read("ops/bot-layer/README.md");
  assert.ok(content.includes("Bot Layer"), "should describe Bot Layer");
  assert.ok(content.includes("Safety Rules"), "should document safety rules");
});
