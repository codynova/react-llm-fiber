/** @type {import('@yarnpkg/types')} */
const { defineConfig } = require('@yarnpkg/types');

/**
 * Enforces single version policy for dependencies across all workspaces.
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 */
const enforceSingleVersionPolicy = ({ Yarn }) => {
  for (const dependency of Yarn.dependencies()) {
    if (dependency.type === `peerDependencies`) continue;
    for (const otherDependency of Yarn.dependencies({ ident: dependency.ident })) {
      if (otherDependency.type === `peerDependencies`) continue;
      dependency.update(otherDependency.range);
    }
  }
};

/**
 * Enforces all workspaces must use "workspace:^" for dependencies when possible.
 * @param {import('@yarnpkg/types').Yarn.Constraints.Context} context
 */
const enforceWorkspaceDependencies = ({ Yarn }) => {
  for (const workspace of Yarn.workspaces()) {
    for (const workspacePackageDependency of Yarn.dependencies({ ident: workspace.ident })) {
      if (workspacePackageDependency.type === 'peerDependencies') continue;
      workspacePackageDependency.update('workspace:^');
    }
  }
};

module.exports = defineConfig({
  async constraints(context) {
    enforceSingleVersionPolicy(context);
    enforceWorkspaceDependencies(context);
  },
});