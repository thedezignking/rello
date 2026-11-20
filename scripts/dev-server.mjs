import fs from "node:fs";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { developmentEnvironment } from "./development-env.mjs";
const read = (file) => (fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {});
const env = developmentEnvironment(process.env, read(".env.development.local"), read(".env.local"));
console.log(
  env.NEXT_PUBLIC_SUPABASE_URL
    ? "Using the dedicated development project."
    : "Using isolated browser storage. Connected development settings belong in .env.development.local.",
);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...process.argv.slice(2)], {
  env,
  stdio: "inherit",
});
for (const event of ["SIGINT", "SIGTERM"]) process.on(event, () => child.kill(event));
child.on("exit", (code) => process.exit(code ?? 1));
