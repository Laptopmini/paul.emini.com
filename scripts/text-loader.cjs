// Turbopack/webpack loader: imports a file as its text (used for content/*.md).
module.exports = function textLoader(source) {
  return `export default ${JSON.stringify(source)};`;
};
