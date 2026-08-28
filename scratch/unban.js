const { cacheManager } = require('./utils/cacheManager');
(async () => {
  try {
    await cacheManager.flushAll(); // Or clear specifically
    console.log("All caches and IP blocks cleared!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
