const defaultResolver = require('jest-resolve/build/defaultResolver').default;
const { builtinModules } = require('module');

module.exports = (request, options) => {
  const strippedRequest = request.startsWith('node:') ? request.slice(5) : request;

  if (builtinModules.includes(strippedRequest)) {
    return strippedRequest;
  }

  return defaultResolver(strippedRequest, options);
};
