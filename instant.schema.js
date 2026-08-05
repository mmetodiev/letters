import { i } from "@instantdb/core";

// One row per user; entity id === auth user id
const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    userData: i.entity({
      bookmarks: i.json(),
      notes: i.json(),
    }),
  },
});

export default _schema;
