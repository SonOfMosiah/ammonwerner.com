// module.exports = function override (config, env) {
//     console.log('override')
//     let loaders = config.resolve
//     loaders.fallback = {
//         "fs": false,
//         "tls": false,
//         "net": false,
//         "http": require.resolve("stream-http"),
//         "https": false,
//         "zlib": require.resolve("browserify-zlib") ,
//         "path": require.resolve("path-browserify"),
//         "stream": require.resolve("stream-browserify"),
//         "util": require.resolve("util/"),
//         "crypto": require.resolve("crypto-browserify"),
//         "crypto-browserify": require.resolve('crypto-browserify'),
//         "os": require.resolve("os-browserify/browser"),
//         "url": require.resolve("url/")
//     }
    
//     return config
// }