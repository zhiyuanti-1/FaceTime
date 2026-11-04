import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { config } from "dotenv";
import oracledb from "oracledb";
config({ path: "apps/api/.env", quiet: true });
const required = ["DB_USER", "DB_PASSWORD", "DB_CONNECT_STRING", "DB_SCHEMA"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`请填写 apps/api/.env: ${missing.join(", ")}`);
  process.exitCode = 1;
} else if (
  process.env.DB_USER !== "FACE_RUNTIME" ||
  process.env.DB_SCHEMA !== "FACE_APP"
) {
  console.error("仅允许 FACE_RUNTIME / FACE_APP；不使用管理账号检查应用。");
  process.exitCode = 1;
} else {
  let connection;
  try {
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });
    const result = await connection.execute(
      "SELECT version,checksum_sha256 FROM face_app.face_migrations",
    );
    const rows = result.rows ?? [];
    let valid = true;
    for (const name of [
      "001-initial-oracle",
      "005-core-workflow",
      "006-ia-workspace",
      "007-resume-structure",
    ]) {
      const hash = createHash("sha256")
        .update(readFileSync(`apps/api/migrations/${name}.sql`))
        .digest("hex");
      const match = rows.some(
        (row) => row[0] === name && row[1]?.trim().toLowerCase() === hash,
      );
      console.info(
        `${name}: ${match ? "OK" : "账本缺失或校验和不符；请人工核对，勿重跑"}`,
      );
      valid &&= match;
    }
    const tables = await connection.execute(
      "SELECT COUNT(*) FROM all_tables WHERE owner='FACE_APP'",
    );
    const count = tables.rows?.[0]?.[0];
    console.info(`FACE_APP表数：${count}（当前预期13）`);
    if (!valid || count !== 13) process.exitCode = 1;
  } catch (error) {
    console.error(
      `数据库检查失败：${error?.code ?? "E_DB_CHECK"}；未输出连接串、口令或SQL参数。`,
    );
    process.exitCode = 1;
  } finally {
    if (connection) await connection.close();
  }
}
