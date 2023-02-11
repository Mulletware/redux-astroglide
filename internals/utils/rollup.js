import { babel } from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";

import pkg from "../../package.json";

const extensions = [".js", ".jsx", ".ts", ".tsx"];

const plugins = [
  json(),
  nodeResolve({ extensions }),
  commonjs(),
  babel({ extensions }),
  process.env.BUILD_ENV !== "dev" && terser(),
];

export const modifyPath = (path, subpath, name) =>
  name
    ? path.replace(
        new RegExp(`^(\\.?\\/?)${subpath}\\/`),
        `$1${subpath}/${name ? `${name}/` : ""}`
      )
    : path;

export const modifyOutputPath = (path, name) => modifyPath(path, "dist", name);
export const modifyInputPath = (path, name) => modifyPath(path, "src", name);

export const makeExportedPackage = (name, pkgConfig = pkg) => {
  pkgConfig = { ...pkg, pkgConfig };

  const path = modifyInputPath("src/index.ts", name);

  return [
    {
      input: path,
      external: [
        Object.keys(pkgConfig.dependencies || {}),
        Object.keys(pkgConfig.peerDependencies || {}),
      ].flat(),
      output: [
        {
          file: modifyOutputPath(pkgConfig.module, name),
          format: "esm",
        },
        {
          file: modifyOutputPath(pkgConfig.main, name),
          format: "cjs",
        },
      ],
      plugins,
    },
    {
      input: path,
      output: [
        {
          name: name ? `${pkgConfig.name}/${name}` : pkgConfig.name,
          file: modifyOutputPath(pkgConfig.browser, name),
          format: "umd",
        },
      ],
      plugins,
    },
  ];
};

const makePackageJsonExports = (packages) => {
  return `package.json "exports" section should read:

  "exports": {${packages
    .map(
      (pkg) => `
    ".${pkg ? `/${pkg}` : ""}": {
      "import": "${modifyOutputPath("./dist/index.es.js", pkg)}",
      "require": "${modifyOutputPath("./dist/index.js", pkg)}"
    }`
    )
    .join(",")}
  }`;
};

export const makeExportedPackages = (...packages) => {
  packages = [undefined, ...packages];

  console.log(makePackageJsonExports(packages));

  return packages.map((pkg) => makeExportedPackage(pkg)).flat();
};
