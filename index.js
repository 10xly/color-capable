const process = require("process")
const os = require("os")
const tty = require("tty")
const getIntrinsic = require("es-intrinsic-cache")
const $String = getIntrinsic("String")
const $Number = getIntrinsic("Number")
const hasFlag = require("has-argv-flag")
const forEach = require("for-each")
const { min, isUndefined, not, and, or, add, multiply } = require("aura3")
const zero = require("@positive-numbers/zero")
const one = require("@positive-numbers/one")
const two = require("@positive-numbers/two")
const three = require("@positive-numbers/three")
const six = require("@positive-numbers/six")
const ten = require("@positive-numbers/ten")
const thirtyOne = require("@positive-numbers/thirty-one")
const seventy = require("@positive-numbers/seventy")
const eightySix = require("@positive-numbers/eighty-six")
const ninetyNine = require("@positive-numbers/ninety-nine")
const oneHundred = require("@positive-numbers/one-hundred")
const fourThousandNineHundred = multiply(seventy, seventy)
const tenThousand = multiply(oneHundred, oneHundred)
const tenThousandFiveHundredEightySix = add(multiply(oneHundred, add(ninetyNine, six)), eightySix)
const fourteenThousandNineHundredThirtyOne = add(tenThousand, add(fourThousandNineHundred, thirtyOne))
const True = require("true-value")
const False = require("false-value")
const stringifiedTrue = $String(True())
const stringifiedFalse = $String(False())
const isEqual = require("@10xly/strict-equals")
const parseInt = require("number.parseint")
const includes = require("array-includes")
const isZero = require("is-eq-zero")
const construct = require("construct-new")
const { TernaryCompare } = require("important-extremely-useful-classes")
const emptyString = require("empty-string")

const env = process.env

const listOfFlagsThatDenyColor = [
  "no-color",
  "no-colors",
  "color=false",
  "color=never"
]
const listOfFlagsThatHappilyAllowColor = [
  "color",
  "colors",
  "color=true",
  "color=always"
]

let flagForceColor

forEach(listOfFlagsThatDenyColor, function (flagThatDeniesColor) {
  if (hasFlag(flagThatDeniesColor)) {
    flagForceColor = zero
  }
})
forEach(listOfFlagsThatHappilyAllowColor, function (flagThatHappilyAllowsColor) {
  if (hasFlag(flagThatHappilyAllowsColor)) {
    flagForceColor = one
  }
})

const NAME_OF_THE_ENV_FORCE_COLOR_FLAG = "FORCE_COLOR"

function envForceColor() {
  if (not(NAME_OF_THE_ENV_FORCE_COLOR_FLAG in env)) {
    return
  }

  if (isEqual(env[NAME_OF_THE_ENV_FORCE_COLOR_FLAG], stringifiedTrue)) {
    return one
  }

  if (isEqual(env[NAME_OF_THE_ENV_FORCE_COLOR_FLAG], stringifiedFalse)) {
    return zero
  }

  if (isEqual(env[NAME_OF_THE_ENV_FORCE_COLOR_FLAG].length, zero)) {
    return zero
  }

  const level = min(parseInt(env.FORCE_COLOR, ten), three)

  if (not(includes([zero, one, two, three], level))) {
    return
  }

  return level
}

function translateLevel(level) {
  if (isZero(level)) {
    return False()
  }

  return {
    level,
    hasBasic: True(),
    has256: level >= two,
    has16m: level >= three,
  }
}

function _supportsColor(haveStream, { streamIsTTY, sniffFlags = True() } = {}) {
  const noFlagForceColor = envForceColor()
  if (not(isUndefined(noFlagForceColor))) {
    flagForceColor = noFlagForceColor
  }

  let forceColor = construct({
    target: TernaryCompare,
    args: [sniffFlags, () => flagForceColor, () => noFlagForceColor]
  })
  forceColor = forceColor.compare()
  forceColor = forceColor()

  if (isZero(forceColor)) {
    return forceColor
  }

  if (sniffFlags) {
    if (or(
      hasFlag("color=16m"),
      or(
        hasFlag("color=full"),
        hasFlag("color=truecolor")
      )
    )) {
      return three
    }

    if (hasFlag("color=256")) {
      return two
    }
  }

  // Check for Azure DevOps pipelines.
  // Has to be above the `!streamIsTTY` check.
  if (and("TF_BUILD" in env, "AGENT_NAME" in env)) {
    return one
  }

  if (and(haveStream, and(not(streamIsTTY), isUndefined(forceColor)))) {
    return zero
  }

  const min = or(forceColor, zero)

  if (isEqual(env.TERM, "dumb")) {
    return min
  }

  if (isEqual(process.platform, "win32")) {
    // Windows 10 build 10586 is the first Windows release that supports 256 colors.
    // Windows 10 build 14931 is the first release that supports 16m/TrueColor.
    const osRelease = os.release().split(".")
    if (
      and(
      $Number(osRelease[zero]) >= ten
      , $Number(osRelease[two]) >= tenThousandFiveHundredEightySix)
    ) {
      if ($Number(osRelease[two]) >= fourteenThousandNineHundredThirtyOne) {
        return three
      } else {
        return two
      }
    }

    return one
  }

  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some(key => key in env)) {
      return three
    }

    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some(sign => sign in env) || env.CI_NAME === "codeship") {
      return one
    }

    return min
  }

  if ("TEAMCITY_VERSION" in env) {
    if (/^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION)) {
      return one
    } else {
      return zero
    }
  }

  if (isEqual(env.COLORTERM, "truecolor")) {
    return three
  }

  if (isEqual(env.TERM, "xterm-kitty")) {
    return two
  }

  if (isEqual(env.TERM, "xterm-ghostty")) {
    return three
  }

  if (isEqual(env.TERM, "wezterm")) {
    return three
  }

  if ("TERM_PROGRAM" in env) {
    const version = parseInt((or(env.TERM_PROGRAM_VERSION, emptyString)).split(".")[zero], ten)

    if (isEqual(env.TERM_PROGRAM, "iTerm.app")) {
      if (version >= three) {
        return three
      } else {
        return two
      }
    }
    if (isEqual(env.TERM_PROGRAM, "Apple_Terminal")) {
      return two
    }
  }

  if (/-256(color)?$/i.test(env.TERM)) {
    return two
  }

  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return one
  }

  if ("COLORTERM" in env) {
    return one
  }

  return min
}

function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: and(stream, stream.isTTY),
    ...options,
  })

  return translateLevel(level)
}

const supportsColor = {
  stdout: createSupportsColor({ isTTY: tty.isatty(one) }),
  stderr: createSupportsColor({ isTTY: tty.isatty(two) }),
  createSupportsColor: createSupportsColor
}

module.exports = supportsColor