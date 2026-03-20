#!/usr/bin/env bun
/**
 * GenerateSkillIndex.ts
 *
 * Parses all SKILL.md files and builds a searchable index for dynamic skill discovery.
 * Run this after adding/modifying skills to update the index.
 *
 * Usage: bun run ~/.opencode/skills/PAI/Tools/GenerateSkillIndex.ts
 *
 * Output: ~/.opencode/skills/skill-index.json
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, relative, sep } from 'path';
import { existsSync } from 'fs';

const SKILLS_DIR = join(import.meta.dir, '..', '..', 'skills');
const OUTPUT_FILE = join(SKILLS_DIR, 'skill-index.json');

interface SkillEntry {
  name: string;
  path: string;
  category: string | null;  // null for flat skills, category name for hierarchical
  fullDescription: string;
  triggers: string[];
  workflows: string[];
  tier: 'always' | 'deferred';
  isHierarchical: boolean;  // true if in skills/Category/Skill/ structure
}

interface SkillIndex {
  generated: string;
  totalSkills: number;
  categories: number;
  flatSkills: number;
  hierarchicalSkills: number;
  alwaysLoadedCount: number;
  deferredCount: number;
  skills: Record<string, SkillEntry>;
  categoryMap: Record<string, string[]>;  // category -> skill names
}

// Skills that should always be fully loaded (Tier 1)
const ALWAYS_LOADED_SKILLS = [
  'CORE',
  'Development',
  'Research',
  'Blogging',
  'Art',
];

async function findSkillFiles(dir: string): Promise<string[]> {
  const skillFiles: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Follow symlinks to directories (upstream 1d2fcb5)
      let isDirectory = entry.isDirectory();
      if (entry.isSymbolicLink()) {
        try {
          const stats = await stat(fullPath);
          isDirectory = stats.isDirectory();
        } catch {
          // Broken symlink — skip silently
          continue;
        }
      }

      if (isDirectory) {
        // Skip hidden directories and node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        // Check for SKILL.md in this directory
        const skillMdPath = join(fullPath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          skillFiles.push(skillMdPath);
        }

        // Recurse into subdirectories (including symlinked ones)
        const nestedFiles = await findSkillFiles(fullPath);
        skillFiles.push(...nestedFiles);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  return skillFiles;
}

function parseFrontmatter(content: string): { name: string; description: string } | null {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return null;

  const frontmatter = frontmatterMatch[1];

  // Extract name
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '';

  // Extract description (handles both single-line and multi-line YAML with | or >)
  let description = '';
  
  // Find the description line
  const descLineMatch = frontmatter.match(/^description:\s*(.*)$/m);
  if (descLineMatch) {
    const indicator = descLineMatch[1].trim(); // |, >, |-, >- or empty
    
    if (indicator === '|' || indicator === '>' || indicator === '|-' || indicator === '>-') {
      // Multiline YAML - extract content until next field
      const descStart = frontmatter.indexOf(descLineMatch[0]) + descLineMatch[0].length;
      const restOfFrontmatter = frontmatter.slice(descStart);
      
      // Find where next field starts (line beginning with field name:)
      const nextFieldMatch = restOfFrontmatter.match(/\n([0-9A-Za-z_-]+):/);
      const rawDesc = nextFieldMatch 
        ? restOfFrontmatter.slice(0, nextFieldMatch.index)
        : restOfFrontmatter;
      
      if (indicator === '>' || indicator === '>-') {
        // Folded style: newlines become spaces
        description = rawDesc
          .split('\n')
          .map(line => line.trimStart())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        // Literal style (| or |-): preserve content but remove common indentation
        const lines = rawDesc.split('\n').filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const minIndent = lines.reduce((min, line) => {
            const match = line.match(/^(\s*)/);
            const indent = match ? match[1].length : 0;
            return Math.min(min, indent);
          }, Infinity);
          description = lines
            .map(line => line.slice(minIndent))
            .join('\n')
            .trim();
        }
      }
    } else {
      // Single-line description
      description = indicator;
    }
  }

  return { name, description };
}

function extractTriggers(description: string): string[] {
  const triggers: string[] = [];

  // Extract from USE WHEN patterns
  const useWhenMatch = description.match(/USE WHEN[^.]+/gi);
  if (useWhenMatch) {
    for (const match of useWhenMatch) {
      // Extract quoted phrases and keywords
      const words = match
        .replace(/USE WHEN/gi, '')
        .replace(/user (says|wants|mentions|asks)/gi, '')
        .replace(/['"]/g, '')
        .split(/[,\s]+/)
        .map(w => w.toLowerCase().trim())
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'from', 'about'].includes(w));

      triggers.push(...words);
    }
  }

  // Also extract key terms from the description
  const keyTerms = description
    .toLowerCase()
    .match(/\b(scrape|parse|extract|research|blog|art|visual|mcp|osint|newsletter|voice|browser|automation|security|vuln|recon|upgrade|telos|gmail|youtube|clickup|cloudflare|lifelog|headshot|council|eval|fabric|dotfiles)\b/g);

  if (keyTerms) {
    triggers.push(...keyTerms);
  }

  // Deduplicate
  return [...new Set(triggers)];
}

function extractWorkflows(content: string): string[] {
  const workflows: string[] = [];

  // Look for workflow routing section
  const workflowMatches = content.matchAll(/[-*]\s*\*\*([A-Z][A-Z_]+)\*\*|→\s*`Workflows\/([^`]+)\.md`|[-*]\s*([A-Za-z]+)\s*→\s*`/g);

  for (const match of workflowMatches) {
    const workflow = match[1] || match[2] || match[3];
    if (workflow) {
      workflows.push(workflow);
    }
  }

  // Also check for workflow files mentioned
  const workflowFileMatches = content.matchAll(/Workflows?\/([A-Za-z]+)\.md/g);
  for (const match of workflowFileMatches) {
    if (match[1] && !workflows.includes(match[1])) {
      workflows.push(match[1]);
    }
  }

  return [...new Set(workflows)];
}

async function parseSkillFile(filePath: string): Promise<SkillEntry | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter || !frontmatter.name) {
      console.warn(`Skipping ${filePath}: No valid frontmatter`);
      return null;
    }

    const triggers = extractTriggers(frontmatter.description);
    const workflows = extractWorkflows(content);
    const tier = ALWAYS_LOADED_SKILLS.includes(frontmatter.name) ? 'always' : 'deferred';

    // Determine category from path (cross-platform using path.relative and path.sep)
    const relPath = relative(SKILLS_DIR, filePath);
    const pathParts = relPath.split(sep).filter(p => p !== '');
    
    // Hierarchical structure: Category/Skill/SKILL.md (3 parts)
    // Flat structure: Skill/SKILL.md (2 parts)
    // Deeper nesting (>3 parts) is warned but still treated as hierarchical
    if (pathParts.length > 3) {
      console.warn(`⚠️  Deep nesting detected at ${filePath} (${pathParts.length} levels). Only 2 levels (Category/Skill) are supported.`);
    }
    
    const isHierarchical = pathParts.length >= 3;
    const category = isHierarchical ? pathParts[0] : null;
    const relativePath = relPath.replace(/\\/g, '/'); // Normalize to forward slashes for output

    return {
      name: frontmatter.name,
      path: relativePath,
      category,
      fullDescription: frontmatter.description,
      triggers,
      workflows,
      tier,
      isHierarchical,
    };
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

async function main() {
  console.log('🔍 Generating skill index for hierarchical structure...\n');

  const skillFiles = await findSkillFiles(SKILLS_DIR);
  console.log(`Found ${skillFiles.length} SKILL.md files\n`);

  const index: SkillIndex = {
    generated: new Date().toISOString(),
    totalSkills: 0,
    categories: 0,
    flatSkills: 0,
    hierarchicalSkills: 0,
    alwaysLoadedCount: 0,
    deferredCount: 0,
    skills: {},
    categoryMap: {},
  };

  // Track categories
  const categories = new Set<string>();

  // Sort skillFiles deterministically
  skillFiles.sort((a, b) => a.localeCompare(b));

  for (const filePath of skillFiles) {
    const skill = await parseSkillFile(filePath);
    if (skill) {
      const key = skill.name.toLowerCase();
      
      // Check for duplicates - don't overwrite existing entries
      if (index.skills[key]) {
        console.warn(`⚠️  Duplicate skill name "${skill.name}" found at ${skill.path} (existing: ${index.skills[key].path})`);
        // Skip adding duplicate
        continue;
      }
      
      index.skills[key] = skill;
      index.totalSkills++;

      if (skill.tier === 'always') {
        index.alwaysLoadedCount++;
      } else {
        index.deferredCount++;
      }

      if (skill.isHierarchical) {
        index.hierarchicalSkills++;
        if (skill.category) {
          categories.add(skill.category);
          if (!index.categoryMap[skill.category]) {
            index.categoryMap[skill.category] = [];
          }
          index.categoryMap[skill.category].push(skill.name);
        }
      } else {
        index.flatSkills++;
      }

      const icon = skill.tier === 'always' ? '🔒' : '📦';
      const structure = skill.isHierarchical ? `📁 ${skill.category}/` : '📄 flat';
      console.log(`  ${icon} ${structure} ${skill.name}: ${skill.triggers.length} triggers, ${skill.workflows.length} workflows`);
    }
  }

  index.categories = categories.size;

  // Sort categoryMap entries deterministically
  for (const category of Object.keys(index.categoryMap)) {
    index.categoryMap[category].sort((a, b) => a.localeCompare(b));
  }

  // Create sorted skills object for deterministic output
  const sortedSkills: Record<string, SkillEntry> = {};
  for (const key of Object.keys(index.skills).sort((a, b) => a.localeCompare(b))) {
    sortedSkills[key] = index.skills[key];
  }
  index.skills = sortedSkills;

  // Write the index
  await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2));

  console.log(`\n✅ Index generated: ${OUTPUT_FILE}`);
  console.log(`\n📊 Structure Overview:`);
  console.log(`   Total Skills: ${index.totalSkills}`);
  console.log(`   📁 Categories: ${index.categories}`);
  console.log(`   📄 Flat Skills: ${index.flatSkills}`);
  console.log(`   📁 Hierarchical: ${index.hierarchicalSkills}`);
  console.log(`\n⚡ Loading Strategy:`);
  console.log(`   Always Loaded: ${index.alwaysLoadedCount}`);
  console.log(`   Deferred: ${index.deferredCount}`);

  // Calculate token estimates
  const avgFullTokens = 150;
  const avgMinimalTokens = 25;
  const currentTokens = index.totalSkills * avgFullTokens;
  const newTokens = (index.alwaysLoadedCount * avgFullTokens) + (index.deferredCount * avgMinimalTokens);
  const savings = ((currentTokens - newTokens) / currentTokens * 100).toFixed(1);

  console.log(`\n💰 Estimated token impact:`);
  console.log(`   Current: ~${currentTokens.toLocaleString()} tokens`);
  console.log(`   After:   ~${newTokens.toLocaleString()} tokens`);
  console.log(`   Savings: ~${savings}%`);

  // Show category breakdown (sorted)
  if (index.categories > 0) {
    console.log(`\n📂 Category Breakdown:`);
    const sortedCategories = Object.keys(index.categoryMap).sort((a, b) => a.localeCompare(b));
    for (const category of sortedCategories) {
      const skills = index.categoryMap[category];
      console.log(`   ${category}: ${skills.length} skills`);
    }
  }
}

main().catch(console.error);
