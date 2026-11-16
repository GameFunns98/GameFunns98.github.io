import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fetchSteam } from "../src/data/steam-source.mjs";

const output = new URL("../public/data/steam.json", import.meta.url);
const temporary = new URL(`${output.href}.${randomUUID()}.tmp`);
try {
  const previous = await readFile(output, "utf8").then(JSON.parse).catch(() => null);
  const result = await fetchSteam(previous?.revision);
  if (result) {
    await writeFile(temporary, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
    await rename(temporary, output);
    console.log(`Steam snapshot updated to ${result.revision}.`);
  } else {
    console.log("Steam snapshot is current.");
  }
} catch (error) {
  console.error(`Steam refresh failed. Prior data retained. ${error instanceof Error ? error.message : ""}`);
  process.exitCode = 1;
} finally {
  await rm(temporary, { force: true });
}
