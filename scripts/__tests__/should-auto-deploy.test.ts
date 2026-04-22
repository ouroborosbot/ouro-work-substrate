import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

function shouldAutoDeploy(changedPaths: string[]): string {
  return execFileSync("bash", ["scripts/should-auto-deploy.sh"], {
    cwd: process.cwd(),
    input: `${changedPaths.join("\n")}\n`,
    encoding: "utf-8",
  }).trim()
}

describe("should-auto-deploy", () => {
  it("skips docs-only changes", () => {
    expect(shouldAutoDeploy([
      "README.md",
      "AGENTS.md",
      "docs/operations.md",
      "infra/azure/README.md",
    ])).toBe("false")
  })

  it("deploys runtime and infrastructure changes", () => {
    expect(shouldAutoDeploy(["apps/mail-ingress/src/server.ts"])).toBe("true")
    expect(shouldAutoDeploy(["infra/azure/main.bicep"])).toBe("true")
  })

  it("deploys mixed docs and runtime changes", () => {
    expect(shouldAutoDeploy([
      "docs/operations.md",
      "apps/mail-control/src/server.ts",
    ])).toBe("true")
  })

  it("treats an empty change list as no deploy", () => {
    expect(shouldAutoDeploy([])).toBe("false")
  })
})
