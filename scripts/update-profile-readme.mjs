// Regenerates the auto-managed repository tables in profile/README.md.
//
// It fetches stars, open issues, and open pull requests from the GitHub API and
// rewrites everything between the <!-- repositories:start --> and
// <!-- repositories:end --> markers. The repository descriptions live here, so this
// script is the single source of truth for that section.
//
//   Local run:  GITHUB_TOKEN=<token> node scripts/update-profile-readme.mjs
//   In CI:      the workflow provides GITHUB_TOKEN automatically.
//
// Runs on plain Node (>= 18, for global fetch). No dependencies.

import { readFileSync, writeFileSync } from "node:fs";

const ORG = "general-liquidity";
const README = "profile/README.md";
const START = "<!-- repositories:start -->";
const END = "<!-- repositories:end -->";

// The ordered groups rendered into the profile. Edit here to add or move a repo.
const GROUPS = [
  {
    title: "Capital markets",
    blurb: "The environments and benchmarks behind the agent.",
    repos: [
      {
        name: "openoutcry",
        display: "OpenOutcry",
        description:
          "A point-in-time market environment for training and evaluating trading agents without lookahead leakage. Every scenario is reconstructed from a seed so runs stay reproducible, with native bindings for Rust, Python, and WebAssembly.",
      },
      {
        name: "sharpebench",
        display: "SharpeBench",
        description:
          "A benchmark that refuses to reward luck. It scores agents on the Sharpe ratio that survives deflation for the number of strategies tried, and asks them to commit before the evaluation window so a result cannot be fit after the fact.",
      },
    ],
  },
  {
    title: "Agentic economy",
    blurb: "Protocols for agents to identify themselves, hold authority, and stay governable.",
    repos: [
      {
        name: "agent-disclosure-protocol",
        display: "Agent Disclosure Protocol",
        description:
          "A protocol for an agent to state who it is, what it is permitted to do, and where it came from, in a form another system can check instead of taking on faith.",
      },
      {
        name: "agentworth",
        display: "AgentWorth",
        description:
          "A governance layer for agents that move money: spending mandates they cannot exceed, kill switches, and signed enforcement that leaves an auditable trail.",
      },
    ],
  },
  {
    title: "Trust and data substrate",
    blurb: "The verifiable spine both halves are built on.",
    repos: [
      {
        name: "fintrieval",
        display: "Fintrieval",
        description:
          'Verifiable, point-in-time memory for the financial agentic economy: a system-of-record for what an agent knew, that it was allowed to act, and that the money reconciled. Bi-temporal recall with no lookahead, cryptographic provenance, and governed writes, over a signed attestation layer anyone can verify offline.',
      },
    ],
  },
];

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": `${ORG}-profile-readme`,
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

// The repo object's open_issues_count folds in PRs, so issues and PRs are counted
// separately via search to keep the two columns honest.
async function counts(name) {
  const repo = await gh(`/repos/${ORG}/${name}`);
  const q = (extra) => encodeURIComponent(`repo:${ORG}/${name} is:open ${extra}`);
  const prs = await gh(`/search/issues?q=${q("is:pr")}&per_page=1`);
  const issues = await gh(`/search/issues?q=${q("is:issue")}&per_page=1`);
  return {
    stars: repo.stargazers_count ?? 0,
    issues: issues.total_count ?? 0,
    prs: prs.total_count ?? 0,
  };
}

function badge(label, message, color, link) {
  const url =
    `https://img.shields.io/static/v1?style=flat-square&logo=github&logoColor=white` +
    `&label=${encodeURIComponent(label)}&message=${encodeURIComponent(String(message))}&color=${color}`;
  return `[![${label}](${url})](${link})`;
}

function row(name, display, description, c) {
  const base = `https://github.com/${ORG}/${name}`;
  return [
    `[${display}](${base})`,
    description,
    badge("stars", c.stars, "0969da", `${base}/stargazers`),
    badge("issues", `${c.issues}+open`, c.issues ? "bf8700" : "1a7f37", `${base}/issues`),
    badge("pull requests", `${c.prs}+open`, c.prs ? "bf8700" : "1a7f37", `${base}/pulls`),
  ].join(" | ");
}

const blocks = [];
for (const group of GROUPS) {
  const rows = [];
  for (const repo of group.repos) {
    let c = { stars: 0, issues: 0, prs: 0 };
    try {
      c = await counts(repo.name);
    } catch (err) {
      // A repo that is not public yet (or a transient API error) renders as zeros
      // rather than failing the whole run.
      console.error(`skip ${repo.name}: ${err.message}`);
    }
    rows.push(`| ${row(repo.name, repo.display ?? repo.name, repo.description, c)} |`);
  }
  blocks.push(
    `### ${group.title}\n\n${group.blurb}\n\n` +
      `| Repository | Description | Stars | Issues | PRs |\n|---|---|--:|--:|--:|\n` +
      rows.join("\n"),
  );
}

const generated =
  `${START}\n` +
  `<!-- Generated by scripts/update-profile-readme.mjs. Do not edit by hand. -->\n\n` +
  `${blocks.join("\n\n")}\n\n${END}`;

const readme = readFileSync(README, "utf8");
const pattern = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!pattern.test(readme)) {
  console.error(`markers not found in ${README}`);
  process.exit(1);
}
writeFileSync(README, readme.replace(pattern, generated));
console.log("profile/README.md updated.");
