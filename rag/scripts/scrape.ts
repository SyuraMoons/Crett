import axios from "axios";
import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import pLimit from "p-limit";

const BASE_URL = "https://docs.chain.link";

// All 92 CRE documentation pages
const CRE_PAGES = [
  // Core
  "/cre",
  "/cre/key-terms",
  "/cre/service-quotas",
  "/cre/supported-networks",
  "/cre/support-feedback",
  "/cre/release-notes",

  // Getting Started
  "/cre/getting-started/overview",
  "/cre/getting-started/cli-installation",
  "/cre/getting-started/cli-installation/macos-linux",
  "/cre/getting-started/cli-installation/windows",
  "/cre/getting-started/before-you-build",
  "/cre/getting-started/part-1-project-setup",
  "/cre/getting-started/part-2-fetching-data",
  "/cre/getting-started/part-3-reading-onchain-value",
  "/cre/getting-started/part-4-writing-onchain",

  // Workflow Guides - Triggers
  "/cre/guides/workflow/using-triggers/overview",
  "/cre/guides/workflow/using-triggers/cron-trigger",
  "/cre/guides/workflow/using-triggers/evm-log-trigger",
  "/cre/guides/workflow/using-triggers/http-trigger/overview",
  "/cre/guides/workflow/using-triggers/http-trigger/configuration",
  "/cre/guides/workflow/using-triggers/http-trigger/testing-in-simulation",
  "/cre/guides/workflow/using-triggers/http-trigger/triggering-deployed-workflows",
  "/cre/guides/workflow/using-triggers/http-trigger/local-testing-tool",

  // Workflow Guides - EVM Client
  "/cre/guides/workflow/using-evm-client/overview",
  "/cre/guides/workflow/using-evm-client/generating-bindings",
  "/cre/guides/workflow/using-evm-client/onchain-read",
  "/cre/guides/workflow/using-evm-client/onchain-write/overview",
  "/cre/guides/workflow/using-evm-client/onchain-write/building-consumer-contracts",
  "/cre/guides/workflow/using-evm-client/onchain-write/writing-data-onchain",
  "/cre/guides/workflow/using-evm-client/onchain-write/using-write-report-helpers",
  "/cre/guides/workflow/using-evm-client/onchain-write/generating-reports-single-values",
  "/cre/guides/workflow/using-evm-client/onchain-write/generating-reports-structs",
  "/cre/guides/workflow/using-evm-client/onchain-write/submitting-reports-onchain",
  "/cre/guides/workflow/using-evm-client/forwarder-directory",

  // Workflow Guides - HTTP Client
  "/cre/guides/workflow/using-http-client",
  "/cre/guides/workflow/using-http-client/get-request",
  "/cre/guides/workflow/using-http-client/post-request",
  "/cre/guides/workflow/using-http-client/submitting-reports-http",

  // Workflow Guides - Confidential HTTP
  "/cre/guides/workflow/using-confidential-http-client",
  "/cre/guides/workflow/using-confidential-http-client/making-requests",

  // Workflow Guides - Other
  "/cre/guides/workflow/secrets",
  "/cre/guides/workflow/secrets/using-secrets-simulation",
  "/cre/guides/workflow/secrets/using-secrets-deployed",
  "/cre/guides/workflow/secrets/managing-secrets-1password",
  "/cre/guides/workflow/time-in-workflows",
  "/cre/guides/workflow/using-randomness",

  // Operations Guides
  "/cre/guides/operations/simulating-workflows",
  "/cre/guides/operations/deploying-workflows",
  "/cre/guides/operations/activating-pausing-workflows",
  "/cre/guides/operations/updating-deployed-workflows",
  "/cre/guides/operations/deleting-workflows",
  "/cre/guides/operations/using-multisig-wallets",
  "/cre/guides/operations/monitoring-workflows",

  // Account
  "/cre/account",
  "/cre/account/creating-account",
  "/cre/account/cli-login",
  "/cre/account/managing-auth",

  // Organization
  "/cre/organization",
  "/cre/organization/understanding-organizations",
  "/cre/organization/linking-keys",
  "/cre/organization/inviting-members",

  // Capabilities
  "/cre/capabilities",
  "/cre/capabilities/triggers",
  "/cre/capabilities/http",
  "/cre/capabilities/confidential-http",
  "/cre/capabilities/evm-read-write",

  // Concepts
  "/cre/concepts/consensus-computing",
  "/cre/concepts/non-determinism",
  "/cre/concepts/typescript-wasm-runtime",
  "/cre/concepts/finality",

  // Templates & Demos
  "/cre/templates/running-demo-workflow",
  "/cre/demos/prediction-market",

  // Reference - CLI
  "/cre/reference/cli",
  "/cre/reference/cli/authentication",
  "/cre/reference/cli/project-setup",
  "/cre/reference/cli/account",
  "/cre/reference/cli/workflow",
  "/cre/reference/cli/secrets",
  "/cre/reference/cli/utilities",

  // Reference - SDK
  "/cre/reference/sdk/overview",
  "/cre/reference/sdk/core",
  "/cre/reference/sdk/triggers/overview",
  "/cre/reference/sdk/triggers/cron-trigger",
  "/cre/reference/sdk/triggers/http-trigger",
  "/cre/reference/sdk/triggers/evm-log-trigger",
  "/cre/reference/sdk/evm-client",
  "/cre/reference/sdk/http-client",
  "/cre/reference/sdk/confidential-http-client",
  "/cre/reference/sdk/consensus",

  // Reference - Project
  "/cre/reference/project-configuration",
  "/cre/reference/gelato-migration",
];

export interface ScrapedPage {
  url: string;
  path: string;
  title: string;
  content: string;
  sections: { heading: string; content: string }[];
  codeBlocks: string[];
  scrapedAt: string;
}

async function scrapePage(pagePath: string): Promise<ScrapedPage | null> {
  const url = `${BASE_URL}${pagePath}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CrettRAG/1.0; +https://github.com/crett)",
        Accept: "text/html,application/xhtml+xml",
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);

    // Extract title
    const title =
      $("h1").first().text().trim() ||
      $("title").text().replace("| Chainlink Documentation", "").trim();

    // Remove nav, footer, sidebar, scripts, styles
    $(
      "nav, footer, header, script, style, .sidebar, .toc, [aria-hidden='true'], .feedback-section"
    ).remove();

    // Extract code blocks before stripping
    const codeBlocks: string[] = [];
    $("pre code, pre").each((_, el) => {
      const code = $(el).text().trim();
      if (code.length > 20) codeBlocks.push(code);
    });

    // Extract sections by heading
    const sections: { heading: string; content: string }[] = [];
    let currentHeading = title;
    let currentContent: string[] = [];

    $("article, main, .content, [role='main']")
      .find("h1, h2, h3, p, pre, ul, ol, table")
      .each((_, el) => {
        const tag = (el as any).tagName?.toLowerCase();
        if (tag === "h1" || tag === "h2" || tag === "h3") {
          if (currentContent.length > 0) {
            sections.push({
              heading: currentHeading,
              content: currentContent.join("\n").trim(),
            });
          }
          currentHeading = $(el).text().trim();
          currentContent = [];
        } else {
          const text = $(el).text().trim();
          if (text.length > 0) currentContent.push(text);
        }
      });

    // Push last section
    if (currentContent.length > 0) {
      sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
    }

    // Full plain text content
    const content = $("article, main, .content, [role='main']")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (!content || content.length < 50) {
      console.log(`  ⚠ Skipped (no content): ${pagePath}`);
      return null;
    }

    return {
      url,
      path: pagePath,
      title,
      content,
      sections,
      codeBlocks,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    if (err.response?.status === 404) {
      console.log(`  ✗ 404: ${pagePath}`);
    } else {
      console.log(`  ✗ Error ${pagePath}: ${err.message}`);
    }
    return null;
  }
}

async function main() {
  console.log("🔍 Starting CRE docs scraper...");
  console.log(`   Pages to scrape: ${CRE_PAGES.length}`);

  // Ensure data directory exists
  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  // Limit concurrency to avoid rate limiting
  const limit = pLimit(3);
  let success = 0;
  let failed = 0;

  const results = await Promise.all(
    CRE_PAGES.map((pagePath) =>
      limit(async () => {
        process.stdout.write(`  Scraping: ${pagePath} ... `);
        const page = await scrapePage(pagePath);
        if (page) {
          console.log(`✓ (${page.content.length} chars, ${page.codeBlocks.length} code blocks)`);
          success++;
        } else {
          failed++;
        }
        return page;
      })
    )
  );

  const pages = results.filter((p): p is ScrapedPage => p !== null);

  // Save raw scraped data
  const outputPath = path.join(dataDir, "scraped.json");
  fs.writeFileSync(outputPath, JSON.stringify(pages, null, 2));

  console.log("\n✅ Scraping complete!");
  console.log(`   Success: ${success} | Failed/Skipped: ${failed}`);
  console.log(`   Saved to: ${outputPath}`);
  console.log(`   Total size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
