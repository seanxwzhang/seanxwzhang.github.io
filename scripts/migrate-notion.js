/**
 * Notion to Markdown Migration Script
 *
 * This script fetches all published posts from your Notion database
 * and converts them to Markdown files with proper frontmatter.
 *
 * Usage:
 *   NOTION_PAGE_ID=xxx NOTION_ACCESS_TOKEN=xxx node scripts/migrate-notion.js
 *
 * Or if you have a .env.local file:
 *   node --env-file=.env.local scripts/migrate-notion.js
 */

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, '..', 'src', 'content', 'posts');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'posts');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN,
});

const n2m = new NotionToMarkdown({ notionClient: notion });

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to download image: ${url}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const imagePath = path.join(IMAGES_DIR, filename);
    await fs.writeFile(imagePath, Buffer.from(buffer));
    return `/images/posts/${filename}`;
  } catch (err) {
    console.warn(`Error downloading image ${url}:`, err.message);
    return null;
  }
}

function sanitizeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function getPageProperties(page) {
  const props = page.properties;

  // Extract title
  let title = 'Untitled';
  if (props.title?.title?.[0]?.plain_text) {
    title = props.title.title[0].plain_text;
  } else if (props.Name?.title?.[0]?.plain_text) {
    title = props.Name.title[0].plain_text;
  }

  // Extract slug
  let slug = '';
  if (props.slug?.rich_text?.[0]?.plain_text) {
    slug = props.slug.rich_text[0].plain_text;
  } else {
    slug = sanitizeFilename(title);
  }

  // Extract date
  let date = new Date().toISOString().split('T')[0];
  if (props.date?.date?.start) {
    date = props.date.date.start;
  } else if (props.Date?.date?.start) {
    date = props.Date.date.start;
  } else if (props.created_time?.created_time) {
    date = props.created_time.created_time.split('T')[0];
  }

  // Extract tags
  let tags = [];
  const tagsProp = props.tags || props.Tags;
  if (tagsProp?.multi_select) {
    tags = tagsProp.multi_select.map((t) => t.name);
  }

  // Extract description/summary
  let description = '';
  const summaryProp = props.summary || props.Summary || props.description || props.Description;
  if (summaryProp?.rich_text?.[0]?.plain_text) {
    description = summaryProp.rich_text[0].plain_text;
  }

  return { title, slug, date, tags, description };
}

async function convertPageToMarkdown(pageId, slug) {
  const mdBlocks = await n2m.pageToMarkdown(pageId);
  let markdown = n2m.toMarkdownString(mdBlocks).parent;

  // Process images - download and replace URLs
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  let imageIndex = 0;

  while ((match = imageRegex.exec(markdown)) !== null) {
    const [fullMatch, altText, imageUrl] = match;

    // Skip if already a local path
    if (imageUrl.startsWith('/')) continue;

    // Download image
    const ext = imageUrl.split('.').pop()?.split('?')[0] || 'png';
    const filename = `${slug}-${imageIndex}.${ext}`;
    const localPath = await downloadImage(imageUrl, filename);

    if (localPath) {
      markdown = markdown.replace(fullMatch, `![${altText}](${localPath})`);
    }
    imageIndex++;
  }

  return markdown;
}

async function fetchAllPosts() {
  const databaseId = process.env.NOTION_PAGE_ID;

  if (!databaseId) {
    throw new Error('NOTION_PAGE_ID environment variable is required');
  }

  console.log(`Fetching posts from Notion database: ${databaseId}`);

  // Query the database
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: 'type',
          select: {
            equals: 'Post',
          },
        },
        {
          property: 'status',
          select: {
            equals: 'Published',
          },
        },
      ],
    },
    sorts: [
      {
        property: 'date',
        direction: 'descending',
      },
    ],
  });

  return response.results;
}

async function migratePost(page) {
  const props = await getPageProperties(page);
  console.log(`Migrating: ${props.title}`);

  // Convert page content to markdown
  const content = await convertPageToMarkdown(page.id, props.slug);

  // Generate frontmatter
  const frontmatter = [
    '---',
    `title: "${props.title.replace(/"/g, '\\"')}"`,
    `date: ${props.date}`,
  ];

  if (props.description) {
    frontmatter.push(`description: "${props.description.replace(/"/g, '\\"')}"`);
  }

  if (props.tags.length > 0) {
    frontmatter.push(`tags: [${props.tags.join(', ')}]`);
  }

  frontmatter.push(`slug: ${props.slug}`);
  frontmatter.push('---');
  frontmatter.push('');

  const fullContent = frontmatter.join('\n') + content;

  // Write file
  const filename = `${props.date}-${props.slug}.md`;
  const filepath = path.join(POSTS_DIR, filename);
  await fs.writeFile(filepath, fullContent, 'utf-8');

  console.log(`  -> ${filename}`);
  return filename;
}

async function main() {
  console.log('Starting Notion migration...\n');

  // Ensure directories exist
  await ensureDir(POSTS_DIR);
  await ensureDir(IMAGES_DIR);

  try {
    const posts = await fetchAllPosts();
    console.log(`Found ${posts.length} published posts\n`);

    const migrated = [];
    for (const page of posts) {
      try {
        const filename = await migratePost(page);
        migrated.push(filename);
      } catch (err) {
        console.error(`  Error migrating page ${page.id}:`, err.message);
      }
    }

    console.log(`\nMigration complete!`);
    console.log(`Successfully migrated ${migrated.length} posts to ${POSTS_DIR}`);

    if (migrated.length > 0) {
      console.log('\nMigrated files:');
      migrated.forEach((f) => console.log(`  - ${f}`));
    }
  } catch (err) {
    if (err.code === 'object_not_found') {
      console.error('Error: Database not found. Make sure NOTION_PAGE_ID is correct.');
      console.error('The ID should be a 32-character string without dashes.');
    } else if (err.code === 'unauthorized') {
      console.error('Error: Unauthorized. Check your NOTION_ACCESS_TOKEN.');
    } else {
      throw err;
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
