#!/usr/bin/env bun

/**
 * UpdateSearch.ts
 * Search past updates by keywords, date range, type
 */

interface SearchArgs {
  query?: string;
  type?: string;
  since?: string;
  limit: number;
}

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

function parseArgs(): SearchArgs | null {
  const args = process.argv.slice(2);
  const parsed: SearchArgs = { limit: 10 };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--query':
        if (!next) {
          console.error('Error: --query requires a value');
          return null;
        }
        parsed.query = next;
        i++;
        break;
      case '--type':
        if (!next) {
          console.error('Error: --type requires a value');
          return null;
        }
        parsed.type = next;
        i++;
        break;
      case '--since':
        if (!next) {
          console.error('Error: --since requires a date (YYYY-MM-DD)');
          return null;
        }
        parsed.since = next;
        i++;
        break;
      case '--limit':
        if (!next || isNaN(parseInt(next))) {
          console.error('Error: --limit requires a number');
          return null;
        }
        parsed.limit = parseInt(next);
        i++;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        console.error(`Error: Unknown argument: ${arg}`);
        return null;
    }
  }

  return parsed;
}

function showHelp(): void {
  console.log(`
Usage: bun run UpdateSearch.ts [OPTIONS]

Options:
  --query TEXT     Search query (searches title and content)
  --type TYPE      Filter by update type (session|project|learning)
  --since DATE     Show updates since date (YYYY-MM-DD format)
  --limit N        Maximum results to return (default: 10)
  -h, --help       Show this help message

Examples:
  bun run UpdateSearch.ts --query "hook"
  bun run UpdateSearch.ts --type session --since 2026-01-01
  bun run UpdateSearch.ts --query "security" --limit 5
`);
}

async function loadIndex(baseDir: string): Promise<IndexData | null> {
  const indexPath = `${baseDir}/index.json`;

  try {
    const content = await Bun.file(indexPath).text();
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

async function searchContent(filePath: string, query: string): Promise<string | null> {
  try {
    const content = await Bun.file(filePath).text();
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    const index = lowerContent.indexOf(lowerQuery);
    if (index === -1) return null;

    // Extract snippet around match
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    let snippet = content.slice(start, end);

    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return snippet;
  } catch (error) {
    return null;
  }
}

async function searchUpdates(args: SearchArgs): Promise<void> {
  const PAI_DIR = process.env.PAI_DIR;
  if (!PAI_DIR) {
    console.error('Error: PAI_DIR environment variable not set');
    process.exit(1);
  }

  const baseDir = `${PAI_DIR}/MEMORY/PAISYSTEMUPDATES`;

  console.log('Loading index...');
  const indexData = await loadIndex(baseDir);

  if (!indexData) {
    console.error('Error: No index found. Run UpdateIndex.ts first.');
    process.exit(1);
  }

  let results = indexData.updates;

  // Filter by type
  if (args.type) {
    results = results.filter(u => u.type === args.type);
    console.log(`Filtered by type: ${args.type} (${results.length} results)`);
  }

  // Filter by date
  if (args.since) {
    const sinceDate = new Date(args.since);
    results = results.filter(u => new Date(u.timestamp) >= sinceDate);
    console.log(`Filtered since: ${args.since} (${results.length} results)`);
  }

  // Search by query
  if (args.query) {
    console.log(`Searching for: "${args.query}"`);
    const matches: Array<{ update: UpdateMetadata; snippet: string | null }> = [];

    for (const update of results) {
      const titleMatch = update.title.toLowerCase().includes(args.query.toLowerCase());
      const snippet = titleMatch ? null : await searchContent(update.path, args.query);

      if (titleMatch || snippet) {
        matches.push({ update, snippet });
      }
    }

    results = matches.map(m => m.update);
    console.log(`Found ${results.length} matches\n`);

    // Display results with snippets
    const displayCount = Math.min(results.length, args.limit);
    for (let i = 0; i < displayCount; i++) {
      const match = matches[i];
      const update = match.update;
      const date = new Date(update.timestamp).toLocaleString();

      console.log(`${i + 1}. ${update.title}`);
      console.log(`   Type: ${update.type} | Significance: ${update.significance}`);
      console.log(`   Date: ${date}`);
      console.log(`   Path: ${update.path}`);

      if (match.snippet) {
        console.log(`   Snippet: ${match.snippet}`);
      }
      console.log('');
    }

    if (results.length > args.limit) {
      console.log(`Showing ${args.limit} of ${results.length} results. Use --limit to see more.`);
    }
  } else {
    // No query - just list filtered results
    const displayCount = Math.min(results.length, args.limit);

    console.log(`\nShowing ${displayCount} of ${results.length} updates:\n`);

    for (let i = 0; i < displayCount; i++) {
      const update = results[i];
      const date = new Date(update.timestamp).toLocaleString();

      console.log(`${i + 1}. ${update.title}`);
      console.log(`   Type: ${update.type} | Significance: ${update.significance}`);
      console.log(`   Date: ${date}`);
      console.log(`   Path: ${update.path}`);
      console.log('');
    }

    if (results.length > args.limit) {
      console.log(`Use --limit to see more results.`);
    }
  }
}

// Main execution
const args = parseArgs();
if (args) {
  await searchUpdates(args);
}
