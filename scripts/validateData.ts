import { DataValidationError, parseGameData, RAW_DATA } from "../data/loadData";

try {
  const data = parseGameData(RAW_DATA);
  console.log("data/*.json OK");
  console.log(`  varieties: ${data.varieties.map((v) => v.id).join(", ")}`);
  console.log(`  pests:     ${data.pests.map((p) => p.id).join(", ")}`);
} catch (error) {
  if (error instanceof DataValidationError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
