#!/usr/bin/env bun
/**
 * ValidateSkillStructure.ts
 *
 * Validates the skill directory structure for consistency and correctness.
 * Run this to check for common issues after reorganizing skills.
 *
 * Usage: bun run ~/.opencode/skills/PAI/Tools/ValidateSkillStructure.ts
 *
 * Checks:
 * - All skills have valid SKILL.md with frontmatter
 * - No orphaned skills (skills without parent category if in hierarchical structure)
 * - Category SKILL.md files exist for all categories
 * - No duplicate skill names
 * - Path consistency
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SKILLS_DIR = join(import.meta.dir, '..', '..', '..', 'skills');

interface ValidationIssue {
  type: 'error' | 'warning';
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    totalSkills: number;
    categories: number;
    flatSkills: number;
    hierarchicalSkills: number;
    errors: number;
    warnings: number;
  };
}

async function validateSkillStructure(): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const skillNames = new Map<string, string>(); // name -> path (for duplicates)
  const categories = new Set<string>();
  const reportedCategories = new Set<string>(); // Track reported missing category SKILL.md
  let flatSkills = 0;
  let hierarchicalSkills = 0;

  async function scanDirectory(dir: string, depth: number = 0): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isSymbolicLink()) {
          try {
            const stats = await stat(fullPath);
            if (!stats.isDirectory()) continue;
            // Valid symlinked directory - will be processed below using stats
          } catch (err) {
            // Report broken symlinks as structural errors
            issues.push({
              type: 'error',
              path: fullPath,
              message: `Broken symlink: ${err instanceof Error ? err.message : String(err)}`,
            });
            continue;
          }
        }

        // Determine if directory (including resolved symlinks)
        const isDirectory = entry.isSymbolicLink() 
          ? (await stat(fullPath)).isDirectory()
          : entry.isDirectory();

        if (isDirectory) {
          // Skip hidden and node_modules
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue;
          }

          const skillMdPath = join(fullPath, 'SKILL.md');
          
          if (existsSync(skillMdPath)) {
            // Found a skill
            const relativePath = fullPath.replace(SKILLS_DIR, '').replace(/^\//, '');
            const pathParts = relativePath.split('/');
            
            if (pathParts.length === 1) {
              // Flat skill: skills/SkillName/
              flatSkills++;
              await validateSkill(skillMdPath, relativePath, issues, skillNames);
            } else if (pathParts.length === 2) {
              // Hierarchical skill: skills/Category/SkillName/
              hierarchicalSkills++;
              categories.add(pathParts[0]);
              await validateSkill(skillMdPath, relativePath, issues, skillNames);
              
              // Check if category SKILL.md exists (deduplicated reporting)
              const categoryPath = join(SKILLS_DIR, pathParts[0]);
              const categorySkillPath = join(categoryPath, 'SKILL.md');
              if (!existsSync(categorySkillPath) && !reportedCategories.has(pathParts[0])) {
                reportedCategories.add(pathParts[0]);
                issues.push({
                  type: 'error',
                  path: categoryPath,
                  message: `Missing category SKILL.md for "${pathParts[0]}"`,
                });
              }
            } else if (pathParts.length > 2) {
              // Too deep nesting
              issues.push({
                type: 'error',
                path: fullPath,
                message: `Too deep nesting (${pathParts.length} levels). Max: 2 (Category/Skill)`,
              });
            }
          } else {
            // No SKILL.md - might be a category or invalid
            if (depth === 0) {
              // Could be a category (allowed at top level without SKILL.md if it has subdirs)
              await scanDirectory(fullPath, depth + 1);
              continue; // Prevent double recursion
            }
          }

          // Recurse for subdirectories (only if not already recursed above)
          await scanDirectory(fullPath, depth + 1);
        }
      }
    } catch (error) {
      issues.push({
        type: 'error',
        path: dir,
        message: `Failed to scan directory: ${error}`,
      });
    }
  }

  await scanDirectory(SKILLS_DIR);

  const errors = issues.filter(i => i.type === 'error').length;
  const warnings = issues.filter(i => i.type === 'warning').length;

  return {
    valid: errors === 0,
    issues,
    stats: {
      totalSkills: flatSkills + hierarchicalSkills,
      categories: categories.size,
      flatSkills,
      hierarchicalSkills,
      errors,
      warnings,
    },
  };
}

async function validateSkill(
  skillPath: string,
  relativePath: string,
  issues: ValidationIssue[],
  skillNames: Map<string, string>
): Promise<void> {
  try {
    const content = await readFile(skillPath, 'utf-8');
    
    // Check frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      issues.push({
        type: 'error',
        path: relativePath,
        message: 'Missing frontmatter (---)',
      });
      return;
    }

    const frontmatter = frontmatterMatch[1];

    // Check name
    const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
    if (!nameMatch) {
      issues.push({
        type: 'error',
        path: relativePath,
        message: 'Missing "name" in frontmatter',
      });
    } else {
      const name = nameMatch[1].trim();
      
      // Check for duplicates
      if (skillNames.has(name.toLowerCase())) {
        issues.push({
          type: 'error',
          path: relativePath,
          message: `Duplicate skill name "${name}" (also at ${skillNames.get(name.toLowerCase())})`,
        });
      } else {
        skillNames.set(name.toLowerCase(), relativePath);
      }

      // Check name matches directory name (best practice, not required)
      const dirName = relativePath.split('/').pop();
      if (dirName && name.toLowerCase() !== dirName.toLowerCase()) {
        issues.push({
          type: 'warning',
          path: relativePath,
          message: `Skill name "${name}" doesn't match directory "${dirName}"`,
        });
      }
    }

    // Check description (handles both single-line and multi-line YAML with | or >)
    const descLineMatch = frontmatter.match(/^description:\s*(.*)$/m);
    if (!descLineMatch) {
      issues.push({
        type: 'warning',
        path: relativePath,
        message: 'Missing "description" in frontmatter (needed for triggers)',
      });
    } else {
      const indicator = descLineMatch[1].trim(); // |, >, |-, >- or empty
      let description: string;
      
      if (indicator === '|' || indicator === '>' || indicator === '|-' || indicator === '>-') {
        // Multiline YAML - extract content until next field
        const descStart = frontmatter.indexOf(descLineMatch[0]) + descLineMatch[0].length;
        const restOfFrontmatter = frontmatter.slice(descStart);
        
        // Find where next field starts
        const nextFieldMatch = restOfFrontmatter.match(/\n([0-9A-Za-z_-]+):/);
        const rawDesc = nextFieldMatch 
          ? restOfFrontmatter.slice(0, nextFieldMatch.index)
          : restOfFrontmatter;
        
        if (indicator === '>' || indicator === '>-') {
          // Folded style: newlines become spaces
          description = rawDesc.split('\n').map(line => line.trimStart()).join(' ').replace(/\s+/g, ' ').trim();
        } else {
          // Literal style: preserve content but remove common indentation
          const lines = rawDesc.split('\n').filter(l => l.trim().length > 0);
          if (lines.length > 0) {
            const minIndent = lines.reduce((min, line) => {
              const match = line.match(/^(\s*)/);
              const indent = match ? match[1].length : 0;
              return Math.min(min, indent);
            }, Infinity);
            description = lines.map(line => line.slice(minIndent)).join('\n').trim();
          } else {
            description = '';
          }
        }
      } else {
        // Single-line description
        description = indicator;
      }
      
      if (!description.includes('USE WHEN')) {
        issues.push({
          type: 'warning',
          path: relativePath,
          message: 'Description should contain "USE WHEN" for trigger detection',
        });
      }
    }

    // Check body content (excluding frontmatter)
    const bodyContent = content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
    if (bodyContent.length < 50) {
      issues.push({
        type: 'warning',
        path: relativePath,
        message: 'SKILL.md body is very short (< 50 chars)',
      });
    }

  } catch (error) {
    issues.push({
      type: 'error',
      path: relativePath,
      message: `Failed to read SKILL.md: ${error}`,
    });
  }
}

async function main() {
  console.log('🔍 Validating skill structure...\n');

  const result = await validateSkillStructure();

  // Print issues
  if (result.issues.length > 0) {
    console.log('📋 Issues Found:\n');
    
    const errors = result.issues.filter(i => i.type === 'error');
    const warnings = result.issues.filter(i => i.type === 'warning');

    if (errors.length > 0) {
      console.log('❌ Errors:');
      for (const issue of errors) {
        console.log(`   ${issue.path}`);
        console.log(`      → ${issue.message}\n`);
      }
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings:');
      for (const issue of warnings) {
        console.log(`   ${issue.path}`);
        console.log(`      → ${issue.message}\n`);
      }
    }
  } else {
    console.log('✅ No issues found!\n');
  }

  // Print stats
  console.log('📊 Statistics:');
  console.log(`   Total Skills: ${result.stats.totalSkills}`);
  console.log(`   📁 Categories: ${result.stats.categories}`);
  console.log(`   📄 Flat: ${result.stats.flatSkills}`);
  console.log(`   📁 Hierarchical: ${result.stats.hierarchicalSkills}`);
  console.log(`\n   ❌ Errors: ${result.stats.errors}`);
  console.log(`   ⚠️  Warnings: ${result.stats.warnings}`);

  // Exit code
  if (!result.valid) {
    console.log('\n❌ Validation failed. Fix errors above before committing.');
    process.exit(1);
  } else {
    console.log('\n✅ Validation passed!');
    if (result.stats.warnings > 0) {
      console.log('   (Warnings are suggestions, not blockers)');
    }
    process.exit(0);
  }
}

main();
