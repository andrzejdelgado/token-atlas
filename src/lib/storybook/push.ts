import { Octokit } from "@octokit/rest";

interface PushOptions {
  token: string;
  repoUrl: string;
  branch: string;
  tokenPath: string;
  content: string;
}

function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) throw new Error("Invalid GitHub repository URL");
  return { owner: match[1], repo: match[2] };
}

export async function pushToStorybook(options: PushOptions): Promise<void> {
  const { owner, repo } = parseRepoUrl(options.repoUrl);
  const octokit = new Octokit({ auth: options.token });

  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: options.tokenPath,
      ref: options.branch,
    });
    if (!Array.isArray(data) && "sha" in data) {
      sha = data.sha;
    }
  } catch {
    // File doesn't exist yet — create it
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: options.tokenPath,
    message: "chore: update design tokens from Token Atlas",
    content: Buffer.from(options.content).toString("base64"),
    branch: options.branch,
    ...(sha ? { sha } : {}),
  });
}
