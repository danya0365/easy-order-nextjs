/**
 * App version info, sourced from build-time env (see next.config.ts).
 * No React hooks inside — safe to call from server or client components.
 */
export function useAppVersion() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
  const commitSha = process.env.NEXT_PUBLIC_COMMIT_SHA || "";
  const shortSha = commitSha.slice(0, 7);

  const displayVersion = shortSha ? `v${version} (${shortSha})` : `v${version}`;

  return {
    version,
    commitSha,
    shortSha,
    displayVersion,
  };
}
