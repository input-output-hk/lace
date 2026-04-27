// Midnight is using node node-fetch, so we need this polyfill.
module.exports = global.fetch;
module.exports.default = global.fetch;
module.exports.fetch = global.fetch;
module.exports.Request = global.Request;
module.exports.Headers = global.Headers;
module.exports.Response = global.Response;
