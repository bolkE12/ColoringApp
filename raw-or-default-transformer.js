// raw-or-default-transformer.js
const upstream = require("metro-react-native-babel-transformer");

module.exports.transform = function ({ src, filename, options }) {
  if (filename.includes("?raw")) {
    return {
      ast: null,
      code: `module.exports = ${JSON.stringify(src)};`,
      filename,
      map: null,
    };
  }
  return upstream.transform({ src, filename, options });
};