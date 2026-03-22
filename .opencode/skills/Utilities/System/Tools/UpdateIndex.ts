#!/usr/bin/env bun

/**
 * UpdateIndex.ts
 * Regenerates index.json and INDEX.md from PAISYSTEMUPDATES files
 */

import { readdirSync, statSync } from 'fs';
import { join } from 'path';

interface UpdateMetadata {
  type: string;
  title: string;
  timestamp: string;
  significance: string;
  path: string;
  slug: string;
}

interface IndexData {
  lastUpdated: string;
  totalUpdates: number;
  byType: Record<string, number>;
  bySignificance: Record<string, number>;
  updates: UpdateMetadata[];
}

function parseArgs(): { rebuild: boolean } {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  return {
    rebuild: args.includes('--rebuild')
  };
}

function showHelp(): void {
  console.log(`
Usage: bun run UpdateIndex.ts [OPTIONS]

Options:
  --rebuild        Force full rebuild of index
  -h, --help       Show this help message

Example:
  bun run UpdateIndex.ts
  bun run UpdateIndex.ts --rebuild
`);
}

function extractFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter: Record<string, string> = {};
  const lines = match[1].split('\n');

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim();
    }
  }

  return frontmatter;
}

async function scanUpdates(baseDir: string): Promise<UpdateMetadata[]> {
  const updates: UpdateMetadata[] = [];

  try {
    const years = readdirSync(baseDir).filter(name => /^\d{4}$/.test(name));

    for (const year of years) {
      const yearPath = join(baseDir, year);
      const months = readdirSync(yearPath).filter(name => /^\d{2}$/.test(name));

      for (const month of months) {
        const monthPath = join(yearPath, month);
        const files = readdirSync(monthPath).filter(name => name.endsWith('.md'));

        for (const file of files) {
          const filePath = join(monthPath, file);

          try {
            const content = await Bun.file(filePath).text();
            const frontmatter = extractFrontmatter(content);

            if (frontmatter) {
              updates.push({
                type: frontmatter.type || 'unknown',
                title: frontmatter.title || 'Untitled',
                timestamp: frontmatter.timestamp || '',
                significance: frontmatter.significance || 'standard',
                path: filePath,
                slug: file.replace('.md', '')
              });
            }
          } catch (error) {
            console.warn(`Warning: Failed to read ${filePath}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error: Failed to scan updates directory');
    throw error;
  }

  // Sort by timestamp (newest first)
  updates.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return updates;
}

function buildIndexData(updates: UpdateMetadata[]): IndexData {
  const byType: Record<string, number> = {};
  const bySignificance: Record<string, number> = {};

  for (const update of updates) {
    byType[update.type] = (byType[update.type] || 0) + 1;
    bySignificance[update.significance] = (bySignificance[update.significance] || 0) + 1;
  }

  return {
    lastUpdated: new Date().toISOString(),
    totalUpdates: updates.length,
    byType,
    bySignificance,
    updates
  };
}

function generateMarkdownIndex(indexData: IndexData): string {
  const { totalUpdates, byType, bySignificance, updates, lastUpdated } = indexData;

  let md = `# jeremAIah System Updates Index

**Last Updated**: ${new Date(lastUpdated).toLocaleString()}
**Total Updates**: ${totalUpdates}

## Statistics

### By Type
${Object.entries(byType).map(([type, count]) => `- **${type}**: ${count}`).join('\n')}

### By Significance
${Object.entries(bySignificance).map(([sig, count]) => `- **${sig}**: ${count}`).join('\n')}

## Recent Updates

`;

  // Show most recent 50 updates
  const recent = updates.slice(0, 50);

  for (const update of recent) {
    const date = new Date(update.timestamp).toLocaleDateString();
    md += `### ${update.title}\n`;
    md += `- **Type**: ${update.type}\n`;
    md += `- **Date**: ${date}\n`;
    md += `- **Significance**: ${update.significance}\n`;
    md += `- **File**: \`${update.path}\`\n\n`;
  }

  if (updates.length > 50) {
    md += `\n_Showing 50 of ${updates.length} total updates. See index.json for complete list._\n`;
  }

  return md;
}

async function updateIndex(): Promise<void> {
  const PAI_DIR = process.env.PAI_DIR;
  if (!PAI_DIR) {
    console.error('Error: PAI_DIR environment variable not set');
    process.exit(1);
  }

  const baseDir = `${PAI_DIR}/MEMORY/PAISYSTEMUPDATES`;
  const indexJsonPath = `${baseDir}/index.json`;
  const indexMdPath = `${baseDir}/INDEX.md`;

  console.log('Scanning updates...');
  const updates = await scanUpdates(baseDir);
  console.log(`Found ${updates.length} updates`);

  console.log('Building index data...');
  const indexData = buildIndexData(updates);

  console.log('Writing index.json...');
  await Bun.write(indexJsonPath, JSON.stringify(indexData, null, 2));

  console.log('Writing INDEX.md...');
  const markdown = generateMarkdownIndex(indexData);
  await Bun.write(indexMdPath, markdown);

  console.log(`✓ Index updated successfully`);
  console.log(`  Total updates: ${indexData.totalUpdates}`);
  console.log(`  JSON: ${indexJsonPath}`);
  console.log(`  Markdown: ${indexMdPath}`);
}

// Main execution
const args = parseArgs();
await updateIndex();
