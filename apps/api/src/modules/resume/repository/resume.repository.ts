import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { ResumeFields } from "@face/shared";
import oracledb from "oracledb";
import { z } from "zod";
import { OracleStore } from "../../../infrastructure/database.js";
import { ApiError } from "../../../infrastructure/http.js";
import {
  listKinds,
  listNames,
  mainColumns,
  sectionNames,
  sections,
  toMainRow,
  toResumeDetail,
  toResumeList,
  toSectionFields,
  toSectionRow,
} from "./resume.mapper.js";

const textRow = z.record(z.string(), z.string().nullable());
const databaseRows = z.array(z.record(z.string(), z.unknown()));
function isLob(
  value: unknown,
): value is Pick<oracledb.Lob, "length" | "getData" | "close"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "length" in value &&
    typeof value.length === "number" &&
    "getData" in value &&
    typeof value.getData === "function" &&
    "close" in value &&
    typeof value.close === "function"
  );
}
const mainTable = "FACE_APP.FACE_RESUME";
const listTable = "FACE_APP.FACE_RESUME_LIST_ITEM";
const ownerFilter = "id = :id AND owner_id = :ownerId";
const stamp = (column: "created_at" | "updated_at") =>
  `TO_CHAR(SYS_EXTRACT_UTC(${column}), 'YYYY-MM-DD"T"HH24:MI:SS.FF6"Z"')`;
const metadata = `id AS "id", ${stamp("created_at")} AS "createdAt", ${stamp("updated_at")} AS "updatedAt"`;

async function rows(
  connection: oracledb.Connection,
  sql: string,
  binds: oracledb.BindParameters,
) {
  const result = await connection.execute<unknown>(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });
  const records = [];
  for (const row of databaseRows.parse(result.rows)) {
    for (const [name, value] of Object.entries(row)) {
      if (!isLob(value)) continue;
      try {
        // 直接按字符串抓取会把空 CLOB 转成 null，失去用户显式清空的值。
        row[name] = value.length === 0 ? "" : await value.getData();
      } finally {
        await value.close();
      }
    }
    records.push(textRow.parse(row));
  }
  return records;
}

function lobValues(columns: Record<string, string | null>) {
  const binds: oracledb.BindParameters = {};
  const values = Object.entries(columns).map(([column, value]) => {
    if (value === "") return { column, sql: "EMPTY_CLOB()" };
    binds[column] = { type: oracledb.CLOB, val: value };
    return { column, sql: `:${column}` };
  });
  return { binds, values };
}

async function insert(
  connection: oracledb.Connection,
  table: string,
  keys: Record<string, string | number>,
  columns: Record<string, string | null>,
) {
  const { binds, values } = lobValues(columns);
  const names = Object.keys(keys);
  await connection.execute(
    `INSERT INTO ${table} (${[...names, ...values.map(({ column }) => column)].join(", ")}) VALUES (${[...names.map((key) => `:${key}`), ...values.map(({ sql }) => sql)].join(", ")})`,
    { ...keys, ...binds },
  );
}

@Injectable()
export class ResumeRepository {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}

  listSummariesByOwner(ownerId: string) {
    return this.db.transaction(async (connection) => {
      const result = await rows(
        connection,
        `SELECT ${metadata}, full_name AS "fullName", desired_role AS "desiredRole" FROM ${mainTable} WHERE owner_id = :ownerId ORDER BY updated_at DESC, id`,
        { ownerId },
      );
      return toResumeList(result);
    });
  }

  findByOwnerWithDetails(ownerId: string, id: string) {
    return this.db.transaction(async (connection) => {
      // 主表和多张明细从同一个 Oracle 快照读取，避免并发保存导致跨版本拼接。
      await connection.execute("SET TRANSACTION READ ONLY");
      return this.readOwnedResumeWithDetails(connection, ownerId, id);
    });
  }

  insertWithDetails(ownerId: string, data: ResumeFields) {
    return this.db.transaction(async (connection) => {
      const id = randomUUID();
      await insert(
        connection,
        mainTable,
        { id, owner_id: ownerId },
        toMainRow(data),
      );
      await this.writeDetails(connection, id, data);
      return this.readOwnedResumeWithDetails(connection, ownerId, id);
    });
  }

  replaceOwnedResumeWithDetails(ownerId: string, id: string, data: ResumeFields) {
    return this.db.transaction(async (connection) => {
      await this.lockOwnedResume(connection, ownerId, id);
      const { binds, values } = lobValues(toMainRow(data));
      const setters = values.map(({ column, sql }) => `${column} = ${sql}`);
      await connection.execute(
        `UPDATE ${mainTable} SET ${setters.join(", ")}, updated_at = SYSTIMESTAMP WHERE ${ownerFilter}`,
        { ...binds, id, ownerId },
      );
      await this.clearDetails(connection, id);
      await this.writeDetails(connection, id, data);
      return this.readOwnedResumeWithDetails(connection, ownerId, id);
    });
  }

  deleteOwnedResumeWithDetails(ownerId: string, id: string) {
    return this.db.transaction(async (connection) => {
      await this.lockOwnedResume(connection, ownerId, id);
      await this.clearDetails(connection, id);
      try {
        await connection.execute(`DELETE FROM ${mainTable} WHERE ${ownerFilter}`, { id, ownerId });
      } catch (error) {
        if (error instanceof Error && "errorNum" in error && error.errorNum === 2292 &&
            error.message.includes("FK_FACE_PROJECT_OWNED_RESUME")) {
          throw new ApiError("E_RESUME_IN_USE", "该简历正在被项目使用，请先更换项目所选简历", 409);
        }
        throw error;
      }
    });
  }

  private async lockOwnedResume(
    connection: oracledb.Connection,
    ownerId: string,
    id: string,
  ) {
    const result = await connection.execute(
      `SELECT id FROM ${mainTable} WHERE ${ownerFilter} FOR UPDATE`,
      { id, ownerId },
    );
    if (!result.rows?.length)
      throw new ApiError("E_RESUME_NOT_FOUND", "未找到该简历", 404);
  }

  private async readOwnedResumeWithDetails(
    connection: oracledb.Connection,
    ownerId: string,
    id: string,
  ) {
    const [main] = await rows(
      connection,
      `SELECT ${metadata}, ${mainColumns.map((column) => `${column} AS "${column}"`).join(", ")} FROM ${mainTable} WHERE ${ownerFilter}`,
      { id, ownerId },
    );
    if (!main) throw new ApiError("E_RESUME_NOT_FOUND", "未找到该简历", 404);
    const details: Record<string, unknown> = {};
    for (const name of sectionNames) {
      const section = sections[name];
      const columns = [
        ...Object.keys(section.text),
        ...Object.keys(section.arrays),
      ].map((column) => `${column} AS "${column}"`);
      const records = await rows(
        connection,
        `SELECT ${columns.join(", ")} FROM FACE_APP.${section.table} WHERE resume_id = :id ORDER BY sort_no`,
        { id },
      );
      details[name] = records.map((record) => toSectionFields(section, record));
    }
    const items = await rows(
      connection,
      `SELECT item_kind AS "kind", item_text AS "text" FROM ${listTable} WHERE resume_id = :id ORDER BY sort_no`,
      { id },
    );
    for (const name of listNames) {
      details[name] = items
        .filter((item) => item.kind === listKinds[name])
        .map((item) => item.text);
    }
    return toResumeDetail(main, details);
  }

  private async writeDetails(
    connection: oracledb.Connection,
    id: string,
    data: ResumeFields,
  ) {
    for (const name of sectionNames) {
      const section = sections[name];
      for (const [index, value] of data[name].entries()) {
        await insert(
          connection,
          `FACE_APP.${section.table}`,
          { resume_id: id, sort_no: index + 1 },
          toSectionRow(section, value),
        );
      }
    }
    for (const name of listNames) {
      for (const [index, value] of data[name].entries()) {
        await insert(
          connection,
          listTable,
          { resume_id: id, item_kind: listKinds[name], sort_no: index + 1 },
          { item_text: value },
        );
      }
    }
  }

  private async clearDetails(connection: oracledb.Connection, id: string) {
    for (const table of [
      ...sectionNames.map((name) => `FACE_APP.${sections[name].table}`),
      listTable,
    ]) {
      await connection.execute(`DELETE FROM ${table} WHERE resume_id = :id`, {
        id,
      });
    }
  }
}
