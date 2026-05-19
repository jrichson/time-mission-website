import contract from './cloudflare-artifact-contract.cjs';

export const {
  OFFLOADED_MP4_FILES,
  MANDATORY_ROOT_FILES,
  MANDATORY_ASSET_DIRS,
  VERIFY_STEPS,
  VERIFY_SUCCESS_MESSAGE,
  formatNpmStep,
  isFinderDuplicateName,
  resolveNpmStep,
  shouldExcludeArtifactPath,
  planRequiredArtifacts,
  planVideoArtifacts,
} = contract;
