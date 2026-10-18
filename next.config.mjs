const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const repoName = "christmas-run";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isGitHubActions
    ? { basePath: `/${repoName}`, assetPrefix: `/${repoName}/` }
    : {}),
};

export default nextConfig;
