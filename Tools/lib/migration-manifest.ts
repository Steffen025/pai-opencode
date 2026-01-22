import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, basename, dirname } from "path";

// ============================================================================
// Types
// ============================================================================

/**
 * PAI Version identifier
 * - "1.x": Legacy PAI (no skills/, no MEMORY/)
 * - "2.0": Early PAI 2.0 (has skills/, history/ but no MEMORY/)
 * - "2.1": PAI 2.1+ (has MEMORY/, USER/SYSTEM separation)
 * - "2.2": PAI 2.2 (has MEMORY/, USER/SYSTEM, enhanced skills)
 * - "2.3": PAI 2.3 (has Packs/ directory)
 * - "unknown": Cannot determine version
 */
export type PAIVersion = "1.x" | "2.0" | "2.1" | "2.2" | "2.3" | "unknown";

/**
 * Version detection result with confidence and evidence
 */
export interface VersionDetectionResult {
  version: PAIVersion;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  migrationSupport: "full" | "partial" | "none";
  migrationNotes: string[];
}

export interface SourceDetection {
  path: string;
  type: "pai-claudecode";
  detected: {
    hooks: string[];
    skills: string[];
    agents: string[];
    customizations: {
      daidentity: boolean;
      permissions: boolean;
      mcpServers: number;
      telosCustomized: boolean;
      customSkills: string[];
    };
  };
}

export interface Transformation {
  type: "directory" | "hook-to-plugin" | "content-update" | "self-check-update" | "file-copy";
  source: string;
  target: string;
  status: "done" | "template-generated" | "skipped" | "failed";
  details?: string;
}

export interface ValidationRequirement {
  id: string;
  description: string;
  type: "deterministic" | "llm-assisted";
  critical: boolean;
}

export interface MigrationManifest {
  version: string;
  timestamp: string;
  source: SourceDetection;
  transformations: Transformation[];
  validationGateResults: Array<{
    file: string;
    choice: "overwrite" | "keep" | "merge" | "defer";
  }>;
  validation: {
    required: ValidationRequirement[];
    passed?: string[];
    failed?: string[];
  };
}

// ============================================================================
// Constants
// ============================================================================

const STANDARD_SKILLS = [
  "CORE",
  "Agents",
  "Browser",
  "Art",
  "Research",
  "Security",
  "THEALGORITHM",
  "SpecFirst",
  "System",
  "FirstPrinciples",
  "Council",
  "RedTeam",
  "BeCreative",
  "Fabric",
  "pdf",
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Creates an empty migration manifest
 */
export function createManifest(source: string): MigrationManifest {
  return {
    version: "0.9.7",
    timestamp: new Date().toISOString(),
    source: {
      path: source,
      type: "pai-claudecode",
      detected: {
        hooks: [],
        skills: [],
        agents: [],
        customizations: {
          daidentity: false,
          permissions: false,
          mcpServers: 0,
          telosCustomized: false,
          customSkills: [],
        },
      },
    },
    transformations: [],
    validationGateResults: [],
    validation: {
      required: [],
    },
  };
}

/**
 * Detects source structure and customizations
 */
export function detectSource(sourcePath: string): SourceDetection {
  const detection: SourceDetection = {
    path: sourcePath,
    type: "pai-claudecode",
    detected: {
      hooks: [],
      skills: [],
      agents: [],
      customizations: {
        daidentity: false,
        permissions: false,
        mcpServers: 0,
        telosCustomized: false,
        customSkills: [],
      },
    },
  };

  // Detect hooks
  const hooksDir = join(sourcePath, "hooks");
  if (existsSync(hooksDir)) {
    const hookFiles = readdirSync(hooksDir).filter(
      (f) => f.endsWith(".ts") || f.endsWith(".js")
    );
    detection.detected.hooks = hookFiles;
  }

  // Detect skills
  const skillsDir = join(sourcePath, "skills");
  if (existsSync(skillsDir)) {
    const skillDirs = readdirSync(skillsDir).filter((f) => {
      const fullPath = join(skillsDir, f);
      return statSync(fullPath).isDirectory();
    });
    detection.detected.skills = skillDirs;

    // Identify custom skills (not in standard list)
    detection.detected.customizations.customSkills = skillDirs.filter(
      (skill) => !STANDARD_SKILLS.includes(skill)
    );
  }

  // Detect agents
  const agentsDir = join(sourcePath, "agents");
  if (existsSync(agentsDir)) {
    const agentFiles = readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    detection.detected.agents = agentFiles;
  }

  // Check settings.json for customizations
  const settingsPath = join(sourcePath, "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

      // Check for DA identity customization
      if (settings.DA || settings.ENGINEER_NAME) {
        detection.detected.customizations.daidentity = true;
      }

      // Check for custom permissions
      if (settings.claudePermissions) {
        detection.detected.customizations.permissions = true;
      }

      // Count MCP servers
      if (settings.mcpServers) {
        const servers = settings.mcpServers;
        detection.detected.customizations.mcpServers = Object.keys(
          typeof servers === "object" ? servers : {}
        ).length;
      }
    } catch (error) {
      console.warn(`Failed to parse settings.json: ${error}`);
    }
  }

  // Check if TELOS.md is customized
  const telosPath = join(sourcePath, "TELOS.md");
  if (existsSync(telosPath)) {
    const telosContent = readFileSync(telosPath, "utf-8");
    // Check if it's not the default template by looking for specific customizations
    // A customized TELOS would have specific project goals, not placeholders
    const hasPlaceholders =
      telosContent.includes("[Your") ||
      telosContent.includes("TODO") ||
      telosContent.includes("PLACEHOLDER");
    detection.detected.customizations.telosCustomized = !hasPlaceholders;
  }

  return detection;
}

/**
 * Adds a transformation record to the manifest
 */
export function addTransformation(
  manifest: MigrationManifest,
  transformation: Transformation
): void {
  manifest.transformations.push(transformation);
}

/**
 * Adds a validation gate result to the manifest
 */
export function addValidationGateResult(
  manifest: MigrationManifest,
  file: string,
  choice: "overwrite" | "keep" | "merge" | "defer"
): void {
  manifest.validationGateResults.push({ file, choice });
}

/**
 * Adds a validation requirement to the manifest
 */
export function addValidationRequirement(
  manifest: MigrationManifest,
  requirement: ValidationRequirement
): void {
  manifest.validation.required.push(requirement);
}

/**
 * Writes the manifest to disk
 */
export function writeManifest(
  manifest: MigrationManifest,
  targetPath: string
): void {
  const manifestPath = join(targetPath, "MIGRATION-MANIFEST.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
  console.log(`✓ Migration manifest written to ${manifestPath}`);
}

/**
 * Reads a manifest from disk
 */
export function readManifest(manifestPath: string): MigrationManifest {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  try {
    const content = readFileSync(manifestPath, "utf-8");
    return JSON.parse(content) as MigrationManifest;
  } catch (error) {
    throw new Error(`Failed to parse manifest: ${error}`);
  }
}

/**
 * Updates validation results in the manifest
 */
export function updateValidationResults(
  manifest: MigrationManifest,
  passed: string[],
  failed: string[]
): void {
  manifest.validation.passed = passed;
  manifest.validation.failed = failed;
}

/**
 * Gets a summary of the manifest
 */
export function getManifestSummary(manifest: MigrationManifest): string {
  const { source, transformations, validationGateResults, validation } = manifest;
  const detected = source.detected;
  const customizations = source.detected.customizations;

  const lines = [
    "Migration Manifest Summary",
    "=========================",
    "",
    `Version: ${manifest.version}`,
    `Timestamp: ${manifest.timestamp}`,
    `Source: ${source.path}`,
    "",
    "Detected:",
    `  Hooks: ${detected.hooks.length}`,
    `  Skills: ${detected.skills.length}`,
    `  Agents: ${detected.agents.length}`,
    `  MCP Servers: ${customizations.mcpServers}`,
    `  Custom Skills: ${customizations.customSkills.join(", ") || "none"}`,
    `  DA Identity: ${customizations.daidentity ? "yes" : "no"}`,
    `  TELOS Customized: ${customizations.telosCustomized ? "yes" : "no"}`,
    "",
    `Transformations: ${transformations.length}`,
    `  Done: ${transformations.filter((t) => t.status === "done").length}`,
    `  Template Generated: ${transformations.filter((t) => t.status === "template-generated").length}`,
    `  Skipped: ${transformations.filter((t) => t.status === "skipped").length}`,
    `  Failed: ${transformations.filter((t) => t.status === "failed").length}`,
    "",
    `Validation Gates: ${validationGateResults.length}`,
    `  Overwrite: ${validationGateResults.filter((r) => r.choice === "overwrite").length}`,
    `  Keep: ${validationGateResults.filter((r) => r.choice === "keep").length}`,
    `  Merge: ${validationGateResults.filter((r) => r.choice === "merge").length}`,
    `  Defer: ${validationGateResults.filter((r) => r.choice === "defer").length}`,
    "",
    `Validation Requirements: ${validation.required.length}`,
    `  Critical: ${validation.required.filter((r) => r.critical).length}`,
    `  Deterministic: ${validation.required.filter((r) => r.type === "deterministic").length}`,
    `  LLM-Assisted: ${validation.required.filter((r) => r.type === "llm-assisted").length}`,
  ];

  if (validation.passed) {
    lines.push(`  Passed: ${validation.passed.length}`);
  }
  if (validation.failed) {
    lines.push(`  Failed: ${validation.failed.length}`);
  }

  return lines.join("\n");
}

/**
 * Validates manifest structure
 */
export function validateManifestStructure(manifest: MigrationManifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!manifest.version) {
    errors.push("Missing version");
  }

  if (!manifest.timestamp) {
    errors.push("Missing timestamp");
  }

  if (!manifest.source || !manifest.source.path) {
    errors.push("Missing source path");
  }

  if (!Array.isArray(manifest.transformations)) {
    errors.push("Transformations must be an array");
  }

  if (!Array.isArray(manifest.validationGateResults)) {
    errors.push("Validation gate results must be an array");
  }

  if (!manifest.validation || !Array.isArray(manifest.validation.required)) {
    errors.push("Validation requirements must be an array");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Version Detection
// ============================================================================

/**
 * Detect the PAI version of a source directory
 *
 * Uses heuristics based on directory structure:
 * - No skills/ → PAI 1.x or not PAI
 * - Has history/ but no MEMORY/ → PAI 2.0
 * - Has MEMORY/ but no USER/ separation → PAI 2.0 late
 * - Has USER/ and SYSTEM/ separation → PAI 2.1+
 * - Has Packs/ directory → PAI 2.3
 * - Has paiVersion in settings.json → Explicit version
 */
export function detectPAIVersion(sourcePath: string): VersionDetectionResult {
  const evidence: string[] = [];
  const migrationNotes: string[] = [];

  // Check for skills/ directory (PAI 2.0+)
  const hasSkills = existsSync(join(sourcePath, "skills"));
  if (!hasSkills) {
    evidence.push("No skills/ directory found");
    return {
      version: "1.x",
      confidence: "high",
      evidence,
      migrationSupport: "none",
      migrationNotes: [
        "PAI 1.x is NOT supported for automatic migration",
        "Complete architectural rewrite between 1.x and 2.x",
        "Recommendation: Start fresh with PAI 2.3 / OpenCode"
      ]
    };
  }
  evidence.push("skills/ directory exists");

  // Check for MEMORY/ vs history/
  const hasMemory = existsSync(join(sourcePath, "MEMORY"));
  const hasHistory = existsSync(join(sourcePath, "history"));

  if (hasHistory && !hasMemory) {
    evidence.push("history/ exists, MEMORY/ missing → PAI 2.0 early");
    return {
      version: "2.0",
      confidence: "high",
      evidence,
      migrationSupport: "partial",
      migrationNotes: [
        "PAI 2.0 requires pre-migration to 2.1+ format",
        "USER/SYSTEM separation doesn't exist yet",
        "Recommendation: Run pai-2.0-to-2.1-migrator first, then use selective import"
      ]
    };
  }

  if (hasMemory) {
    evidence.push("MEMORY/ directory exists");
  }

  // Check for USER/SYSTEM separation (PAI 2.1+)
  const hasUserDir = existsSync(join(sourcePath, "skills/CORE/USER"));
  const hasSystemDir = existsSync(join(sourcePath, "skills/CORE/SYSTEM"));

  if (!hasUserDir && !hasSystemDir) {
    evidence.push("No USER/SYSTEM separation in skills/CORE/");
    return {
      version: "2.0",
      confidence: "medium",
      evidence,
      migrationSupport: "partial",
      migrationNotes: [
        "PAI 2.0 detected (late version with MEMORY but no USER/SYSTEM split)",
        "Selective import will work but USER files need manual identification",
        "Recommendation: Consider full migration or manual content extraction"
      ]
    };
  }

  if (hasUserDir) {
    evidence.push("skills/CORE/USER/ exists → PAI 2.1+");
  }
  if (hasSystemDir) {
    evidence.push("skills/CORE/SYSTEM/ exists → PAI 2.1+");
  }

  // Check for Packs/ (PAI 2.3)
  const hasPacks = existsSync(join(sourcePath, "Packs"));
  if (hasPacks) {
    evidence.push("Packs/ directory exists → PAI 2.3");
    return {
      version: "2.3",
      confidence: "high",
      evidence,
      migrationSupport: "full",
      migrationNotes: [
        "PAI 2.3 detected - full migration support",
        "Selective import will preserve USER content and MEMORY",
        "SYSTEM files will be skipped (OpenCode 2.3 version used)"
      ]
    };
  }

  // Check settings.json for explicit version
  const settingsPath = join(sourcePath, "settings.json");
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      if (settings.paiVersion) {
        const v = settings.paiVersion;
        evidence.push(`paiVersion in settings.json: ${v}`);

        if (v.startsWith("2.3")) {
          return {
            version: "2.3",
            confidence: "high",
            evidence,
            migrationSupport: "full",
            migrationNotes: ["Explicit PAI 2.3 version detected"]
          };
        }
        if (v.startsWith("2.2")) {
          return {
            version: "2.2",
            confidence: "high",
            evidence,
            migrationSupport: "full",
            migrationNotes: ["PAI 2.2 - full support via selective import"]
          };
        }
        if (v.startsWith("2.1")) {
          return {
            version: "2.1",
            confidence: "high",
            evidence,
            migrationSupport: "full",
            migrationNotes: ["PAI 2.1 - full support via selective import"]
          };
        }
        if (v.startsWith("2.0")) {
          return {
            version: "2.0",
            confidence: "high",
            evidence,
            migrationSupport: "partial",
            migrationNotes: ["PAI 2.0 - partial support, may need pre-migration"]
          };
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Default to 2.1 if has USER/SYSTEM separation but no Packs or explicit version
  return {
    version: hasUserDir ? "2.1" : "2.0",
    confidence: "medium",
    evidence,
    migrationSupport: hasUserDir ? "full" : "partial",
    migrationNotes: hasUserDir
      ? ["PAI 2.1+ detected - full selective import support"]
      : ["PAI 2.0 detected - consider pre-migration for best results"]
  };
}

/**
 * Check if a source is compatible with selective migration
 */
export function isSelectiveMigrationSupported(sourcePath: string): {
  supported: boolean;
  version: PAIVersion;
  reason: string;
} {
  const detection = detectPAIVersion(sourcePath);

  if (detection.migrationSupport === "none") {
    return {
      supported: false,
      version: detection.version,
      reason: `PAI ${detection.version} is not supported. ${detection.migrationNotes[0]}`
    };
  }

  if (detection.migrationSupport === "partial") {
    return {
      supported: true,
      version: detection.version,
      reason: `PAI ${detection.version} has partial support. ${detection.migrationNotes[0]}`
    };
  }

  return {
    supported: true,
    version: detection.version,
    reason: `PAI ${detection.version} has full selective import support.`
  };
}

/**
 * Get user-friendly version info for display
 */
export function formatVersionInfo(result: VersionDetectionResult): string {
  const lines: string[] = [];

  lines.push(`📦 PAI Version: ${result.version}`);
  lines.push(`   Confidence: ${result.confidence}`);
  lines.push(`   Migration Support: ${result.migrationSupport.toUpperCase()}`);
  lines.push("");
  lines.push("Evidence:");
  result.evidence.forEach(e => lines.push(`   • ${e}`));
  lines.push("");
  lines.push("Notes:");
  result.migrationNotes.forEach(n => lines.push(`   • ${n}`));

  return lines.join("\n");
}
