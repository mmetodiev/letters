import * as esbuild from "esbuild";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const instant = JSON.parse(
  readFileSync(join(root, "src/_data/instant.json"), "utf8")
);
const appId = typeof instant.appId === "string" ? instant.appId.trim() : "";

await esbuild.build({
  entryPoints: [join(root, "client/user-data.js")],
  bundle: true,
  outfile: join(root, "src/user-data.js"),
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  define: {
    __INSTANT_APP_ID__: JSON.stringify(appId),
  },
  logLevel: "info",
});
