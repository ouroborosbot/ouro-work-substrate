import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function shouldAutoDeploy(changedPaths: string[]): string {
  return execFileSync("bash", ["scripts/should-auto-deploy.sh"], {
    cwd: process.cwd(),
    input: `${changedPaths.join("\n")}\n`,
    encoding: "utf-8",
  }).trim()
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
  }).trim()
}

function writeFileInRepo(repoPath: string, filePath: string, contents: string): void {
  const absolutePath = join(repoPath, filePath)
  mkdirSync(join(absolutePath, ".."), { recursive: true })
  writeFileSync(absolutePath, contents)
}

function commitFile(repoPath: string, filePath: string, contents: string, message: string): string {
  writeFileInRepo(repoPath, filePath, contents)
  git(repoPath, ["add", filePath])
  git(repoPath, ["commit", "-m", message])
  return git(repoPath, ["rev-parse", "HEAD"])
}

function withGitFixture<T>(callback: (repoPath: string) => T): T {
  const repoPath = mkdtempSync(join(tmpdir(), "ouro-auto-deploy-"))
  try {
    git(repoPath, ["init", "-q"])
    git(repoPath, ["config", "user.email", "test@example.com"])
    git(repoPath, ["config", "user.name", "Test User"])
    return callback(repoPath)
  } finally {
    rmSync(repoPath, { recursive: true, force: true })
  }
}

function shouldAutoDeployBetween(repoPath: string, deployedSha: string, deploySha: string): {
  changedFiles: string[]
  reason: string
  shouldDeploy: string
} {
  const changedFilesPath = join(repoPath, "changed-files.txt")
  const reasonPath = join(repoPath, "auto-deploy-reason.txt")
  const shouldDeploy = execFileSync(
    "bash",
    [
      join(process.cwd(), "scripts/should-auto-deploy-between.sh"),
      deployedSha,
      deploySha,
      changedFilesPath,
      reasonPath,
    ],
    {
      cwd: repoPath,
      encoding: "utf-8",
      env: {
        ...process.env,
        AUTO_DEPLOY_PATH_CLASSIFIER: join(process.cwd(), "scripts/should-auto-deploy.sh"),
      },
    },
  ).trim()

  return {
    changedFiles: execFileSync("bash", ["-lc", `cat "${changedFilesPath}"`], {
      cwd: repoPath,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean),
    reason: execFileSync("bash", ["-lc", `cat "${reasonPath}"`], {
      cwd: repoPath,
      encoding: "utf-8",
    }).trim(),
    shouldDeploy,
  }
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

describe("should-auto-deploy-between", () => {
  it("deploys when runtime changes exist between the current image and the tested commit", () => {
    withGitFixture((repoPath) => {
      const deployedSha = commitFile(repoPath, "README.md", "hello\n", "initial docs")
      commitFile(repoPath, "apps/mail-ingress/src/server.ts", "export const value = 1\n", "runtime")
      const deploySha = commitFile(repoPath, "docs/operations.md", "ops\n", "docs")

      const result = shouldAutoDeployBetween(repoPath, deployedSha, deploySha)

      expect(result.shouldDeploy).toBe("true")
      expect(result.changedFiles).toEqual([
        "apps/mail-ingress/src/server.ts",
        "docs/operations.md",
      ])
      expect(result.reason).toContain("changed since deployed image")
    })
  })

  it("skips when only docs changed since the current image", () => {
    withGitFixture((repoPath) => {
      commitFile(repoPath, "apps/mail-ingress/src/server.ts", "export const value = 1\n", "runtime")
      const deployedSha = git(repoPath, ["rev-parse", "HEAD"])
      const deploySha = commitFile(repoPath, "docs/operations.md", "ops\n", "docs")

      const result = shouldAutoDeployBetween(repoPath, deployedSha, deploySha)

      expect(result.shouldDeploy).toBe("false")
      expect(result.changedFiles).toEqual(["docs/operations.md"])
      expect(result.reason).toContain("Only documentation files changed since deployed image")
    })
  })

  it("deploys conservatively when the deployed image SHA cannot be trusted", () => {
    withGitFixture((repoPath) => {
      const deploySha = commitFile(repoPath, "docs/operations.md", "ops\n", "docs")

      const result = shouldAutoDeployBetween(repoPath, "not-a-sha", deploySha)

      expect(result.shouldDeploy).toBe("true")
      expect(result.changedFiles).toEqual([])
      expect(result.reason).toContain("Deployed image SHA is missing or invalid")
    })
  })

  it("deploys conservatively when the deployed image is not an ancestor of the tested commit", () => {
    withGitFixture((repoPath) => {
      const firstBranchSha = commitFile(repoPath, "apps/mail-ingress/src/server.ts", "export const value = 1\n", "runtime")
      git(repoPath, ["checkout", "-q", "--orphan", "other"])
      git(repoPath, ["rm", "-rf", "."])
      const deploySha = commitFile(repoPath, "docs/operations.md", "ops\n", "docs")

      const result = shouldAutoDeployBetween(repoPath, firstBranchSha, deploySha)

      expect(result.shouldDeploy).toBe("true")
      expect(result.changedFiles).toEqual([])
      expect(result.reason).toContain("not an ancestor")
    })
  })
})
