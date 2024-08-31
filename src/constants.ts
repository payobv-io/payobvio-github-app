export const API_BASE_URL = process.env.WEB_API_HOST ?? ""
export const SOLANA_NETWORK = process.env.SOLANA_NETWORK ?? "devnet"

export const PATTERNS = {
  BOUNTY: /(?<=^Bounty\s+)(\d+(\.\d+)?)/g,
  ISSUE_NUMBER: /(?<=^Issue\s+#)(\d+)/g
}

export const MESSAGES = {
  BOUNTY_SET: (bounty: number) => `Bounty set to ${bounty} SOL, awaiting escrow.`,
  BOUNTY_ESCROWED: (bounty: number) => `Bounty of ${bounty} SOL has been escrowed.`,
  PR_OPEN: (authorGithubId: string, bounty: number) => `Hello @${authorGithubId}\nThank you for your contribution. Your bounty of ${bounty} SOL has been escrowed.\nPlease go through the following instructions to claim your bounty.\n1. Go to this [link](${API_BASE_URL})\n2. Register and finish the onboarding process\n\nAfter you have completed the onboarding process, please wait until this PR is merged. Once the PR is merged, we will be able to release the bounty to you.`,
  PR_MERGE: (authorGithubId: string, bounty: number) => `@${authorGithubId} has resolved the issue\n\nPlease visit your [dashboard](${API_BASE_URL}/maintainer/dashboard) to release the bounty of ${bounty} SOL to the author.`,
  BOUNTY_RELEASE: (authorGithubId: string, bounty: number, explorerLink: string) => `Congratulations @${authorGithubId}!\nA bounty of ${bounty} SOL has been sent to you.\nPlease check [Solana Explorer](${explorerLink}) for more details.`,

  BOUNTY_SET_ERROR: "Failed to set bounty",
  INVALID_BOUNTY: "Invalid Bounty Amount",
  ADD_REPOSITORY_INSTALLATION_ERROR: "Failed to add repositories installation",
  REMOVE_REPOSITORY_INSTALLATION_ERROR: "Failed to remove repositories installation",
}

export const ENDPOINTS = {
  BOUNTIES: `${API_BASE_URL}/api/bounties`,
  REPOSITORIES_INSTALLATION: `${API_BASE_URL}/api/installations`,
  CHECK_BOUNTY: (repositoryId: number, issueNumber: number) => `${API_BASE_URL}/api/bounties/${repositoryId}/${issueNumber}`,
  RELEASE_BOUNTY: `${API_BASE_URL}/api/release-bounty`,
}

export const LINKS = {
  SOLANA_EXPLORER: (signature: string, cluster: string = SOLANA_NETWORK) => `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`,
}

export const LABELS = {
  ESCROWED: (bounty: number) => `${bounty} SOL Escrowed`,
  RELEASED: (bounty: number) => `${bounty} SOL Rewarded`,
  AWAITING_BOUNTY_RELEASE: "Awaiting Bounty Release",
}