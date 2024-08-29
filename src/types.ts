export type EscrowSetDetail = {
  issueNumber: number
  bounty: number,
  owner: string,
  repo: string,
  installationId: number
}

export type EscrowSetRequestBody = {
  action: "approved" | "rejected",
  detail: EscrowSetDetail
}

export type BountySetRequestBody = {
  bounty: number,
  issueNumber: number,
  title: string,
  authorId: number,
  repositoryId: number
}

export type InstallationRepositoriesRequestBody = {
  userId: number,
  installationId: number,
  repositories: {
    id: number,
    name: string,
    isPrivate: boolean
  }[]     
} 

export type RemoveRepositoriesRequestBody = Omit<InstallationRepositoriesRequestBody, "installationId" | "repositories"> & {
  repositories: number[]
}

export type ReleaseBountyPayload = {
  repositoryId: number,
  issueNumber: number,
  authorId: number,
  pullRequestNumber: number,
}

export type BountyReleasedDetail = {
  owner: string,
  repo: string,
  bounty: number,
  issueNumber: number,
  installationId: number,
  authorGithubId: string,
  transactionSignature: string
}

export type Repository = {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
}