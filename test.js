/* eslint-env mocha */
"use strict";

const { expect } = require("chai");
const proxyquire = require("proxyquire").noCallThru();

function loadSupportsColor({
  env = {},
  platform = "linux",
  osRelease = "5.0.0",
  stdoutIsTTY = true,
  stderrIsTTY = true,
  argvFlags = [],
} = {}) {
  const processStub = {
    env: { ...env },
    platform,
  };

  const osStub = {
    release: () => osRelease,
  };

  const ttyStub = {
    isatty: (fd) => {
      if (fd === 1) return stdoutIsTTY;
      if (fd === 2) return stderrIsTTY;
      return false;
    },
  };

  const hasArgvFlagStub = (flag) => argvFlags.includes(flag);

  const supportsColor = proxyquire("./index", {
    process: processStub,
    os: osStub,
    tty: ttyStub,
    "has-argv-flag": hasArgvFlagStub,
  });

  return { supportsColor, processStub, osStub, ttyStub };
}

describe("supportsColor", function () {
  describe("createSupportsColor basic behavior", function () {
    it("returns false when level is 0 (e.g. FORCE_COLOR=false)", function () {
      const { supportsColor } = loadSupportsColor({
        env: { FORCE_COLOR: "false" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result).to.equal(false);
    });

    it("returns level 1 when FORCE_COLOR=true", function () {
      const { supportsColor } = loadSupportsColor({
        env: { FORCE_COLOR: "true" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result).to.deep.include({
        level: 1,
        hasBasic: true,
        has256: false,
        has16m: false,
      });
    });

    it("returns level 2 when FORCE_COLOR=2", function () {
      const { supportsColor } = loadSupportsColor({
        env: { FORCE_COLOR: "2" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result).to.deep.include({
        level: 2,
        hasBasic: true,
        has256: true,
        has16m: false,
      });
    });

    it("ignores invalid numeric FORCE_COLOR and falls back to TERM heuristics", function () {
      const { supportsColor } = loadSupportsColor({
        env: { FORCE_COLOR: "10", TERM: "xterm-256color" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      // no valid FORCE_COLOR => TERM-256color gives level 2
      expect(result.level).to.equal(2);
    });
  });

  describe("CLI flags (has-argv-flag)", function () {
    it("forces flagForceColor = 0 with no-color", function () {
      const { supportsColor } = loadSupportsColor({
        argvFlags: ["no-color"],
        env: { TERM: "xterm-256color" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      // translateLevel(0) => false
      expect(result).to.equal(false);
    });

    it("forces flagForceColor = 1 with color", function () {
      const { supportsColor } = loadSupportsColor({
        argvFlags: ["color"],
        env: {},
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(1);
      expect(result.hasBasic).to.equal(true);
    });

    it("returns level 3 with color=16m flag", function () {
      const { supportsColor } = loadSupportsColor({
        argvFlags: ["color=16m"],
        env: {},
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(3);
      expect(result.has16m).to.equal(true);
    });

    it("returns level 2 with color=256 flag", function () {
      const { supportsColor } = loadSupportsColor({
        argvFlags: ["color=256"],
        env: {},
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(2);
      expect(result.has256).to.equal(true);
    });

    it("does not look at flags when sniffFlags = false", function () {
      const { supportsColor } = loadSupportsColor({
        argvFlags: ["color=16m"],
        env: { TERM: "xterm-256color" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor(
        { isTTY: true },
        { sniffFlags: false }
      );

      // TERM=*-256color gives 2; color=16m is ignored
      expect(result.level).to.equal(2);
    });
  });

  describe("TTY behavior", function () {
    it("returns false when stream is not TTY and no forceColor", function () {
      const { supportsColor } = loadSupportsColor({
        env: {},
        stdoutIsTTY: false,
      });

      const result = supportsColor.createSupportsColor({ isTTY: false });
      expect(result).to.equal(false);
    });

    it("allows color when non-TTY but FORCE_COLOR=true", function () {
      const { supportsColor } = loadSupportsColor({
        env: { FORCE_COLOR: "true" },
        stdoutIsTTY: false,
      });

      const result = supportsColor.createSupportsColor({ isTTY: false });
      expect(result.level).to.equal(1);
      expect(result.hasBasic).to.equal(true);
    });
  });

  describe("Azure DevOps behavior", function () {
    it("returns level 1 when TF_BUILD and AGENT_NAME exist", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TF_BUILD: "1", AGENT_NAME: "agent" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(1);
    });
  });

  describe("Windows behavior", function () {
    it("returns level 1 for non-Windows 10 releases", function () {
      const { supportsColor } = loadSupportsColor({
        platform: "win32",
        osRelease: "6.3.9600",
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(1);
    });

    it("returns level 2 for Windows 10 build 10586+", function () {
      const { supportsColor } = loadSupportsColor({
        platform: "win32",
        osRelease: "10.0.10586",
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(2);
      expect(result.has256).to.equal(true);
    });

    it("returns level 3 for Windows 10 build 14931+", function () {
      const { supportsColor } = loadSupportsColor({
        platform: "win32",
        osRelease: "10.0.14931",
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(3);
      expect(result.has16m).to.equal(true);
    });
  });

  describe("CI behavior", function () {
    it("returns level 3 on GitHub Actions", function () {
      const { supportsColor } = loadSupportsColor({
        env: { CI: "1", GITHUB_ACTIONS: "true" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(3);
    });

    it("returns level 1 on Travis", function () {
      const { supportsColor } = loadSupportsColor({
        env: { CI: "1", TRAVIS: "true" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(1);
    });

    it("returns min level when CI vendor is unknown", function () {
      const { supportsColor } = loadSupportsColor({
        env: { CI: "1" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      // min level when nothing else helps is 0 => false
      expect(result === false || result.level === 0).to.equal(true);
    });
  });

  describe("TEAMCITY behavior", function () {
    it("returns level 1 for TEAMCITY_VERSION >= 9.1", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TEAMCITY_VERSION: "9.1.0" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(1);
    });

    it("returns false for TEAMCITY_VERSION < 9.1", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TEAMCITY_VERSION: "8.1.0" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result).to.equal(false);
    });
  });

  describe("TERM / COLORTERM / TERM_PROGRAM heuristics", function () {
    it("returns level 3 when COLORTERM=truecolor", function () {
      const { supportsColor } = loadSupportsColor({
        env: { COLORTERM: "truecolor" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(3);
    });

    it("returns level 2 when TERM=xterm-kitty", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TERM: "xterm-kitty" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(2);
    });

    it("returns level 3 when TERM=xterm-ghostty", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TERM: "xterm-ghostty" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(3);
    });

    it("returns level 3 when TERM=wezterm", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TERM: "wezterm" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(3);
    });

    it("returns level 2 when TERM ends with -256color", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TERM: "xterm-256color" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(2);
    });

    it("returns level 1 for generic color-capable TERM", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TERM: "xterm" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(1);
    });

    it("returns level 1 if COLORTERM is set even if TERM is weird", function () {
      const { supportsColor } = loadSupportsColor({
        env: { COLORTERM: "yes", TERM: "weirdterm" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(1);
    });

    it("returns min (0) for TERM=dumb", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TERM: "dumb" },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result === false || result.level === 0).to.equal(true);
    });

    it("returns level 3 for iTerm.app >= 3", function () {
      const { supportsColor } = loadSupportsColor({
        env: {
          TERM_PROGRAM: "iTerm.app",
          TERM_PROGRAM_VERSION: "3.1.0",
        },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(3);
    });

    it("returns level 2 for iTerm.app < 3", function () {
      const { supportsColor } = loadSupportsColor({
        env: {
          TERM_PROGRAM: "iTerm.app",
          TERM_PROGRAM_VERSION: "2.9.0",
        },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(2);
    });

    it("returns level 2 for Apple_Terminal", function () {
      const { supportsColor } = loadSupportsColor({
        env: {
          TERM_PROGRAM: "Apple_Terminal",
          TERM_PROGRAM_VERSION: "999.0",
        },
        stdoutIsTTY: true,
      });

      const result = supportsColor.createSupportsColor({ isTTY: true });
      expect(result.level).to.equal(2);
    });
  });

  describe("top-level stdout and stderr", function () {
    it("uses tty.isatty(1/2) for default stdout/stderr", function () {
      const { supportsColor } = loadSupportsColor({
        env: { TERM: "xterm-256color" },
        stdoutIsTTY: true,
        stderrIsTTY: false,
      });

      const { stdout, stderr } = supportsColor;

      // stdout is TTY and TERM-256color => level >= 2
      expect(stdout === false || stdout.level >= 2).to.equal(true);

      // stderr is not TTY => likely false or 0
      expect(stderr === false || stderr.level === 0).to.equal(true);
    });
  });
});
