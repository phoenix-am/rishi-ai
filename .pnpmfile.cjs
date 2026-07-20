function readPackage(pkg, context) {
  if (pkg.dependencies && pkg.dependencies.axios) {
    pkg.dependencies.axios = "^1.7.0";
    context.log(`Overriding axios dependency in ${pkg.name} to ^1.7.0`);
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
