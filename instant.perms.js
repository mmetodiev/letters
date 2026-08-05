/** @type {import('@instantdb/core').InstantRules} */
const rules = {
  attrs: {
    allow: {
      $default: "false",
    },
  },
  userData: {
    allow: {
      view: "auth.id == data.id",
      create: "auth.id == data.id",
      update: "auth.id == data.id",
      delete: "auth.id == data.id",
    },
  },
};

export default rules;
