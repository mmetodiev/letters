module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/style.css");
  eleventyConfig.addPassthroughCopy("src/user-data.js");
  eleventyConfig.addPassthroughCopy("src/manifest.webmanifest");
  eleventyConfig.addPassthroughCopy("src/sw.js");
  eleventyConfig.addPassthroughCopy("src/icons");

  eleventyConfig.addCollection("letters", function (collectionApi) {
    return collectionApi
      .getFilteredByGlob("./src/letters/letter-*.md")
      .sort(
        (a, b) => (a.data.chapterNum || 0) - (b.data.chapterNum || 0)
      );
  });

  eleventyConfig.addFilter("letterByNum", function (collection, num) {
    const list = collection || [];
    return list.find((item) => item.data.chapterNum === num);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
