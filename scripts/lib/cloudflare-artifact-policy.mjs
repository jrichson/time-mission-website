import contract from './cloudflare-artifact-contract.cjs';

export const {
  OFFLOADED_MP4_FILES,
  MANDATORY_ROOT_FILES,
  MANDATORY_ASSET_DIRS,
  copyFilteredTree,
  pruneExcludedArtifacts,
  shouldExcludeArtifactPath,
  shouldPruneArtifactEntry,
  walkDeployFiles,
  planRequiredArtifacts,
  planVideoArtifacts,
} = contract;
