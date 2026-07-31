function readPackage(pkg, context) {
  if (pkg.dependencies && pkg.dependencies.axios) {
    pkg.dependencies.axios = "^1.7.0";
    context.log(`Overriding axios dependency in ${pkg.name} to ^1.7.0`);
  }

  if (pkg.name === "@nestjs/platform-fastify" && pkg.dependencies?.["find-my-way"]) {
    pkg.dependencies["find-my-way"] = "9.7.0";
    context.log("Overriding find-my-way in @nestjs/platform-fastify to 9.7.0");
  }

  if (pkg.name === "@nestjs/swagger" && pkg.dependencies?.["js-yaml"]) {
    pkg.dependencies["js-yaml"] = "5.2.2";
    context.log("Overriding js-yaml in @nestjs/swagger to 5.2.2");
  }

  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};
