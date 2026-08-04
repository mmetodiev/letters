module.exports = {
  eleventyComputed: {
    layout: (data) =>
      data.chapterNum != null ? "letter.njk" : data.layout || "toc.njk",
    permalink: (data) => {
      if (data.chapterNum == null) {
        return data.permalink || "/letters/index.html";
      }
      return `/letters/${data.page.fileSlug}/index.html`;
    },
  },
};
