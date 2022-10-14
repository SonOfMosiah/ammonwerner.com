module.exports = {
    resolve: {
      fallback: {
        "fs": false,
        "tls": false,
        "net": false,
        "path": false,
        "zlib": false,
        "http": require.resolve("stream-http"),
        "https": false,
        "stream": false,
        "crypto": false,
        "crypto-browserify": false
      },
    },
  };