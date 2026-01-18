#!/usr/bin/env bun
/**
 * PAI to OpenCode Converter
 *
 * Translates PAI 2.x (Claude Code) configurations to OpenCode format.
 *
 * Usage:
 *   bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode
 *   bun run tools/pai-to-opencode-converter.ts --source ~/.claude --target .opencode --dry-run
 *   bun run tools/pai-to-opencode-converter.ts --help
 *
 * What it translates:
 *   - settings.json → opencode.json (schema mapping)
 *   - skills/ → skill/ (path + minor adjustments)
 *   - agents/ → agent/ (YAML frontmatter format)
 *   - MEMORY/ → MEMORY/ (direct copy with path updates)
 *
 * What it does NOT translate (requires manual work):
 *   - hooks/ → plugin/ (fundamentally different architecture)
 *
 * @version 0.8.0
 * @author PAI-OpenCode Project
 */

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, basename, dirname, relative } from "path";
import { parseArgs } from "util";

// ============================================================================
// Types
// ============================================================================

interface ConversionResult {
  success: boolean;
  source: string;
  target: string;
  converted: string[];
  skipped: string[];
  warnings: string[];
  errors: string[];
  manualRequired: string[];
}

interface SettingsJson {
  paiVersion?: string;
  env?: Record<string, string>;
  daidentity?: {
    name?: string;
    fullName?: string;
    displayName?: string;
    color?: string;
    voiceId?: string;
    voice?: Record<string, unknown>;
    startupCatchphrase?: string;
  };
  principal?: {
    name?: string;
    timezone?: string;
  };
  permissions?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
    defaultMode?: string;
  };
  hooks?: Record<string, unknown>;
  mcpServers?: Record<string, unknown>;
}

interface OpencodeJson {
  $schema?: string;
  theme?: string;
  model?: string;
  small_model?: string;
  username?: string;
  default_agent?: string;
  plugin?: string[];
  snapshot?: boolean;
  share?: string;
  autoupdate?: boolean | "notify";
  logLevel?: string;
  mcp?: Record<string, unknown>;
  agent?: Record<string, {
    model?: string;
    prompt?: string;
    description?: string;
    color?: string;
  }>;
}

// ============================================================================
// CLI Parsing
// ============================================================================

function printHelp(): void {
  console.log(`
PAI to OpenCode Converter v0.8.0

USAGE:
  bun run tools/pai-to-opencode-converter.ts [OPTIONS]

OPTIONS:
  --source <path>    Source PAI directory (default: ~/.claude)
  --target <path>    Target OpenCode directory (default: .opencode)
  --dry-run          Show what would be done without making changes
  --backup           Create backup before conversion (default: true)
  --no-backup        Skip backup creation
  --verbose          Show detailed output
  --help             Show this help message

EXAMPLES:
  # Convert with defaults
  bun run tools/pai-to-opencode-converter.ts

  # Convert from specific source
  bun run tools/pai-to-opencode-converter.ts --source /path/to/.claude --target .opencode

  # Dry run to preview changes
  bun run tools/pai-to-opencode-converter.ts --dry-run --verbose

WHAT GETS CONVERTED:
  ✅ settings.json → opencode.json (schema mapping)
  ✅ skills/ → skill/ (directory copy with path updates)
  ✅ agents/ → agent/ (YAML frontmatter format)
  ✅ MEMORY/ → MEMORY/ (direct copy)

WHAT REQUIRES MANUAL WORK:
  ⚠️  hooks/ → plugin/ (architecture differs - see migration report)

OUTPUT:
  Creates a migration report at <target>/MIGRATION-REPORT.md
`);
}

function parseCliArgs(): {
  source: string;
  target: string;
  dryRun: boolean;
  backup: boolean;
  verbose: boolean;
  help: boolean;
} {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      source: { type: "string", default: "~/.claude" },
      target: { type: "string", default: ".opencode" },
      "dry-run": { type: "boolean", default: false },
      backup: { type: "boolean", default: true },
      "no-backup": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
  });

  // Expand ~ in paths
  const expandPath = (p: string): string => {
    if (p.startsWith("~/")) {
      return join(process.env.HOME || "", p.slice(2));
    }
    return p;
  };

  return {
    source: expandPath(values.source as string),
    target: expandPath(values.target as string),
    dryRun: values["dry-run"] as boolean,
    backup: (values.backup as boolean) && !(values["no-backup"] as boolean),
    verbose: values.verbose as boolean,
    help: values.help as boolean,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

function log(message: string, verbose: boolean, forceShow = false): void {
  if (verbose || forceShow) {
    console.log(message);
  }
}

function ensureDir(dir: string, dryRun: boolean): void {
  if (!dryRun && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src: string, dest: string, dryRun: boolean, verbose: boolean): string[] {
  const copied: string[] = [];

  if (!existsSync(src)) {
    return copied;
  }

  ensureDir(dest, dryRun);

  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copied.push(...copyDir(srcPath, destPath, dryRun, verbose));
    } else {
      log(`  Copy: ${relative(process.cwd(), srcPath)} → ${relative(process.cwd(), destPath)}`, verbose);
      if (!dryRun) {
        copyFileSync(srcPath, destPath);
      }
      copied.push(destPath);
    }
  }

  return copied;
}

// ============================================================================
// Translators
// ============================================================================

/**
 * Translate PAI settings.json to OpenCode opencode.json
 */
function translateSettings(source: string, target: string, dryRun: boolean, verbose: boolean): {
  success: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const settingsPath = join(source, "settings.json");

  if (!existsSync(settingsPath)) {
    warnings.push("No settings.json found in source directory");
    return { success: false, warnings };
  }

  const settings: SettingsJson = JSON.parse(readFileSync(settingsPath, "utf-8"));
  log(`  Reading: ${settingsPath}`, verbose);

  // Map to OpenCode format - OpenCode uses a different schema than PAI
  // See: https://opencode.ai/config.json for schema reference
  const opencode: OpencodeJson = {
    $schema: "https://opencode.ai/config.json",
    theme: "dark",
    model: "anthropic/claude-sonnet-4-5",  // OpenCode uses provider/model format
    snapshot: true,
  };

  // Map username from principal.name or daidentity.name
  if (settings.principal?.name) {
    opencode.username = settings.principal.name;
  }

  // Map MCP servers
  if (settings.mcpServers) {
    opencode.mcp = settings.mcpServers;
    warnings.push(
      "MCP servers copied but may need adjustment. " +
      "OpenCode MCP format may differ slightly from Claude Code."
    );
  }

  // Note about permissions - OpenCode handles them differently (via plugins)
  if (settings.permissions) {
    warnings.push(
      `PAI permissions (allow/deny/ask) cannot be auto-translated. ` +
      `OpenCode uses plugin-based permission handling. See MIGRATION-REPORT.md.`
    );
  }

  // Note about hooks - they need manual migration
  if (settings.hooks) {
    const hookCount = Object.keys(settings.hooks).length;
    warnings.push(
      `PAI hooks (${hookCount} event types) require manual migration to OpenCode plugins. ` +
      `See MIGRATION-REPORT.md for details.`
    );
  }

  // Note about AI identity - OpenCode doesn't have this concept in config
  if (settings.daidentity) {
    warnings.push(
      `PAI daidentity (AI name, color, voice) is not supported in OpenCode config. ` +
      `This can be implemented via CORE skill customization.`
    );
  }

  // Write opencode.json - should go to project ROOT, not inside .opencode
  // If target ends with .opencode, put opencode.json in parent directory
  let configDir = target;
  if (target.endsWith(".opencode") || target.endsWith(".opencode/")) {
    configDir = dirname(target);
    // Handle case where target is literally ".opencode" (relative path)
    if (configDir === ".") {
      configDir = process.cwd();
    }
  }

  const outputPath = join(configDir, "opencode.json");
  log(`  Writing: ${outputPath}`, verbose);

  if (!dryRun) {
    ensureDir(configDir, dryRun);
    writeFileSync(outputPath, JSON.stringify(opencode, null, 2) + "\n");
  }

  return { success: true, warnings };
}

/**
 * Translate PAI skills/ to OpenCode skill/
 *
 * Skills are nearly identical in format - just copy with path updates
 */
function translateSkills(source: string, target: string, dryRun: boolean, verbose: boolean): {
  converted: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const skillsSource = join(source, "skills");
  const skillsTarget = join(target, "skill");

  if (!existsSync(skillsSource)) {
    warnings.push("No skills/ directory found in source");
    return { converted: [], warnings };
  }

  log(`\nTranslating skills/`, verbose, true);
  const converted = copyDir(skillsSource, skillsTarget, dryRun, verbose);

  // Update any .claude references in skill files to .opencode
  if (!dryRun) {
    for (const file of converted) {
      if (file.endsWith(".md") || file.endsWith(".ts")) {
        let content = readFileSync(file, "utf-8");
        const originalContent = content;

        // Replace common path references
        content = content.replace(/\.claude\//g, ".opencode/");
        content = content.replace(/~\/\.claude/g, "~/.opencode");
        // OpenCode uses singular 'skill' not 'skills'
        content = content.replace(/\.opencode\/skills\//g, ".opencode/skill/");

        // Fix YAML frontmatter: quote description fields that contain special chars
        // This prevents YAML parsing errors with colons, quotes, etc.
        if (file.endsWith(".md")) {
          content = content.replace(
            /^(description:\s*)(.+)$/gm,
            (match, prefix, desc) => {
              // If already quoted, leave it alone
              if ((desc.startsWith('"') && desc.endsWith('"')) ||
                  (desc.startsWith("'") && desc.endsWith("'"))) {
                return match;
              }
              // If contains special YAML chars (colon, quote, etc.), wrap in quotes
              if (desc.includes(':') || desc.includes("'") || desc.includes('"') ||
                  desc.includes('#') || desc.includes('|') || desc.includes('>')) {
                // Escape internal double quotes and wrap
                const escaped = desc.replace(/"/g, '\\"');
                return `${prefix}"${escaped}"`;
              }
              return match;
            }
          );
        }

        if (content !== originalContent) {
          writeFileSync(file, content);
          log(`  Updated paths in: ${relative(process.cwd(), file)}`, verbose);
        }
      }
    }
  }

  return { converted, warnings };
}

// Named color to hex mapping for agent color conversion
const COLOR_NAME_TO_HEX: Record<string, string> = {
  // Basic colors
  red: "#FF0000",
  green: "#00FF00",
  blue: "#0000FF",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  yellow: "#FFFF00",
  black: "#000000",
  white: "#FFFFFF",
  // Extended colors
  orange: "#FFA500",
  purple: "#800080",
  pink: "#FFC0CB",
  gray: "#808080",
  grey: "#808080",
  lime: "#00FF00",
  navy: "#000080",
  teal: "#008080",
  olive: "#808000",
  maroon: "#800000",
  silver: "#C0C0C0",
  aqua: "#00FFFF",
  fuchsia: "#FF00FF",
  coral: "#FF7F50",
  gold: "#FFD700",
  indigo: "#4B0082",
  violet: "#EE82EE",
  turquoise: "#40E0D0",
  salmon: "#FA8072",
  crimson: "#DC143C",
};

/**
 * Convert named color to hex format
 * OpenCode requires hex format #RRGGBB for agent colors
 */
function convertColorToHex(color: string): string {
  // If already hex format, return as-is
  if (color.startsWith("#") && color.length === 7) {
    return color;
  }
  // If it's a short hex like #FFF, expand it
  if (color.startsWith("#") && color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  // Convert named color to hex
  const normalized = color.toLowerCase().trim();
  return COLOR_NAME_TO_HEX[normalized] || "#808080"; // Default to gray if unknown
}

/**
 * Translate PAI agents/ to OpenCode agent/
 *
 * Agent format is similar but OpenCode uses different frontmatter.
 * Key differences:
 * - OpenCode requires hex colors (#RRGGBB), not named colors
 * - voiceId and permissions fields may not be supported
 */
function translateAgents(source: string, target: string, dryRun: boolean, verbose: boolean): {
  converted: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const agentsSource = join(source, "agents");
  const agentsTarget = join(target, "agent");

  if (!existsSync(agentsSource)) {
    // Agents are optional
    return { converted: [], warnings };
  }

  log(`\nTranslating agents/`, verbose, true);
  const converted = copyDir(agentsSource, agentsTarget, dryRun, verbose);

  // Post-process agent files to convert named colors to hex
  if (!dryRun) {
    for (const file of converted) {
      if (file.endsWith(".md")) {
        let content = readFileSync(file, "utf-8");
        const originalContent = content;

        // Find and replace color field in YAML frontmatter
        // Matches: color: cyan or color: "cyan" etc.
        content = content.replace(
          /^(color:\s*)([a-zA-Z]+)(\s*)$/gm,
          (match, prefix, colorName, suffix) => {
            const hexColor = convertColorToHex(colorName);
            log(`  Color converted: ${colorName} → ${hexColor} in ${basename(file)}`, verbose);
            return `${prefix}"${hexColor}"${suffix}`;
          }
        );

        // Also handle quoted named colors
        content = content.replace(
          /^(color:\s*["'])([a-zA-Z]+)(["']\s*)$/gm,
          (match, prefix, colorName, suffix) => {
            const hexColor = convertColorToHex(colorName);
            log(`  Color converted: ${colorName} → ${hexColor} in ${basename(file)}`, verbose);
            return `${prefix.replace(/["']$/, '"')}${hexColor}"`;
          }
        );

        // Remove unsupported fields that OpenCode doesn't recognize
        // voiceId is PAI-specific
        content = content.replace(/^voiceId:.*$/gm, "# voiceId removed (PAI-specific)");

        // PAI permissions format differs from OpenCode
        // Remove entire permissions block in frontmatter
        content = content.replace(
          /^permissions:\s*\n(\s+.*\n)*/gm,
          "# permissions removed (use OpenCode plugins instead)\n"
        );

        if (content !== originalContent) {
          writeFileSync(file, content);
          log(`  Transformed: ${relative(process.cwd(), file)}`, verbose);
        }
      }
    }
  }

  return { converted, warnings };
}

/**
 * Copy MEMORY/ directory (direct copy, structure is compatible)
 */
function translateMemory(source: string, target: string, dryRun: boolean, verbose: boolean): {
  converted: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const memorySource = join(source, "MEMORY");
  const memoryTarget = join(target, "MEMORY");

  if (!existsSync(memorySource)) {
    return { converted: [], warnings };
  }

  log(`\nCopying MEMORY/`, verbose, true);
  const converted = copyDir(memorySource, memoryTarget, dryRun, verbose);

  return { converted, warnings };
}

/**
 * Generate migration report documenting manual work needed
 */
function generateMigrationReport(
  result: ConversionResult,
  source: string,
  target: string,
  dryRun: boolean
): void {
  const hooksSource = join(source, "hooks");
  let hooksInfo = "";

  if (existsSync(hooksSource)) {
    const hooks = readdirSync(hooksSource).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
    hooksInfo = `
## Hooks Requiring Manual Migration

The following hooks were found but **cannot be auto-translated** due to architectural differences:

| PAI Hook File | OpenCode Equivalent | Migration Notes |
|---------------|---------------------|-----------------|
${hooks.map(h => `| \`${h}\` | plugin handler | Rewrite as async function in \`plugin/pai-unified.ts\` |`).join("\n")}

### Hook → Plugin Migration Guide

PAI hooks use **shell scripts with exit codes**:
\`\`\`typescript
// PAI Hook (Claude Code)
export default async function(input) {
  if (dangerous) {
    process.exit(2); // Block execution
  }
}
\`\`\`

OpenCode plugins use **async functions that throw**:
\`\`\`typescript
// OpenCode Plugin
"tool.execute.before": async (input, output) => {
  if (dangerous) {
    throw new Error("Blocked!"); // Block execution
  }
}
\`\`\`

**Key Differences:**
1. Args location: \`output.args\` (NOT \`input.args\`)
2. Tool names: lowercase (\`bash\`, not \`Bash\`)
3. Blocking: throw Error (NOT exit code 2)
4. Logging: file-only (NOT console.log - corrupts TUI)

See \`docs/PLUGIN-ARCHITECTURE.md\` for complete guide.
`;
  }

  const report = `# PAI → OpenCode Migration Report

**Generated:** ${new Date().toISOString()}
**Source:** \`${source}\`
**Target:** \`${target}\`
**Mode:** ${dryRun ? "DRY RUN" : "EXECUTED"}

## Summary

| Category | Count |
|----------|-------|
| Files Converted | ${result.converted.length} |
| Files Skipped | ${result.skipped.length} |
| Warnings | ${result.warnings.length} |
| Errors | ${result.errors.length} |
| Manual Work Required | ${result.manualRequired.length} |

## What Was Converted

${result.converted.length > 0 ? result.converted.map(f => `- ✅ \`${relative(process.cwd(), f)}\``).join("\n") : "No files converted."}

## Warnings

${result.warnings.length > 0 ? result.warnings.map(w => `- ⚠️ ${w}`).join("\n") : "No warnings."}

## Errors

${result.errors.length > 0 ? result.errors.map(e => `- ❌ ${e}`).join("\n") : "No errors."}
${hooksInfo}
## Next Steps

1. Review the converted files in \`${target}/\`
2. Manually migrate hooks to plugins (see guide above)
3. Test the OpenCode installation:
   \`\`\`bash
   cd ${target}/..
   opencode
   \`\`\`
4. Verify skills load correctly
5. Test security blocking if applicable

## References

- [PAI-OpenCode Documentation](https://github.com/Steffen025/pai-opencode)
- [OpenCode Plugin Docs](https://opencode.ai/docs/plugins/)
- \`docs/PLUGIN-ARCHITECTURE.md\` - Detailed plugin guide
- \`docs/EVENT-MAPPING.md\` - Hook → Event mapping

---
*Generated by pai-to-opencode-converter v0.8.0*
`;

  const reportPath = join(target, "MIGRATION-REPORT.md");

  if (!dryRun) {
    ensureDir(target, dryRun);
    writeFileSync(reportPath, report);
  }

  console.log(`\n📄 Migration report: ${reportPath}`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  const args = parseCliArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log(`
╭──────────────────────────────────────────╮
│  PAI → OpenCode Converter v0.8.0        │
╰──────────────────────────────────────────╯
`);

  console.log(`Source: ${args.source}`);
  console.log(`Target: ${args.target}`);
  console.log(`Mode:   ${args.dryRun ? "DRY RUN" : "EXECUTE"}`);
  console.log("");

  // Validate source exists
  if (!existsSync(args.source)) {
    console.error(`❌ Source directory not found: ${args.source}`);
    process.exit(1);
  }

  // Initialize result
  const result: ConversionResult = {
    success: true,
    source: args.source,
    target: args.target,
    converted: [],
    skipped: [],
    warnings: [],
    errors: [],
    manualRequired: [],
  };

  // Create backup if requested
  if (args.backup && existsSync(args.target) && !args.dryRun) {
    const backupPath = `${args.target}.backup-${Date.now()}`;
    console.log(`📦 Creating backup: ${backupPath}`);
    copyDir(args.target, backupPath, false, args.verbose);
  }

  // 1. Translate settings
  console.log("\n📋 Translating settings.json...");
  const settingsResult = translateSettings(args.source, args.target, args.dryRun, args.verbose);
  if (settingsResult.success) {
    result.converted.push(join(args.target, "opencode.json"));
  }
  result.warnings.push(...settingsResult.warnings);

  // 2. Translate skills
  console.log("\n📚 Translating skills/...");
  const skillsResult = translateSkills(args.source, args.target, args.dryRun, args.verbose);
  result.converted.push(...skillsResult.converted);
  result.warnings.push(...skillsResult.warnings);

  // 3. Translate agents
  console.log("\n🤖 Translating agents/...");
  const agentsResult = translateAgents(args.source, args.target, args.dryRun, args.verbose);
  result.converted.push(...agentsResult.converted);
  result.warnings.push(...agentsResult.warnings);

  // 4. Copy MEMORY
  console.log("\n💾 Copying MEMORY/...");
  const memoryResult = translateMemory(args.source, args.target, args.dryRun, args.verbose);
  result.converted.push(...memoryResult.converted);
  result.warnings.push(...memoryResult.warnings);

  // 5. Check for hooks (manual migration required)
  const hooksPath = join(args.source, "hooks");
  if (existsSync(hooksPath)) {
    const hooks = readdirSync(hooksPath).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
    if (hooks.length > 0) {
      result.manualRequired.push(...hooks.map(h => `hooks/${h} → plugin/ (manual migration)`));
      result.warnings.push(
        `Found ${hooks.length} hooks that require manual migration to plugins. ` +
        `See MIGRATION-REPORT.md for details.`
      );
    }
  }

  // Generate migration report
  generateMigrationReport(result, args.source, args.target, args.dryRun);

  // Print summary
  console.log(`
╭──────────────────────────────────────────╮
│  Conversion Complete                     │
╰──────────────────────────────────────────╯

✅ Converted: ${result.converted.length} files
⚠️  Warnings:  ${result.warnings.length}
🔧 Manual:    ${result.manualRequired.length} items

${args.dryRun ? "This was a DRY RUN - no files were modified." : "Files have been written to: " + args.target}
`);

  if (result.warnings.length > 0) {
    console.log("Warnings:");
    result.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
  }

  if (result.manualRequired.length > 0) {
    console.log("\nManual migration required:");
    result.manualRequired.forEach(m => console.log(`  🔧 ${m}`));
  }
}

main().catch(err => {
  console.error("❌ Converter failed:", err);
  process.exit(1);
});
