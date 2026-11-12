import { randomUUID } from "node:crypto";
import {
  projectDetailResponse,
  projectListResponse,
  type ProjectReplaceRequest,
  type ProjectSaveRequest,
} from "@face/shared";
import { Inject, Injectable } from "@nestjs/common";
import oracledb from "oracledb";
import { z } from "zod";
import { OracleStore } from "../../infrastructure/database.js";
import { ApiError } from "../../infrastructure/http.js";

const table = "FACE_APP.FACE_PROJECT";
const owned = "owner_id = :ownerId AND id = :id";
const stamp = (column: "created_at" | "updated_at") =>
  `TO_CHAR(SYS_EXTRACT_UTC(${column}), 'YYYY-MM-DD"T"HH24:MI:SS.FF6"Z"')`;
const summary = `id AS "id", target_role AS "targetRole", target_company AS "targetCompany",
  ${stamp("created_at")} AS "createdAt", ${stamp("updated_at")} AS "updatedAt"`;
const order = "ORDER BY SYS_EXTRACT_UTC(updated_at) DESC, id DESC";
const version = `${stamp("updated_at")} = :expectedUpdatedAt`;
const summaryWithCount = z.array(z.strictObject({
  total: z.int().nonnegative(),
  project: z.record(z.string(), z.unknown()),
}));

function requireProject<T>(row: T | undefined): T {
  if (row === undefined) throw new ApiError("E_PROJECT_NOT_FOUND", "未找到该项目", 404);
  return row;
}

function saveValues(data: ProjectSaveRequest) {
  return {
    targetRole: data.targetRole,
    targetCompany: data.targetCompany ?? null,
    resumeId: data.resumeId,
    jdText: { type: oracledb.CLOB, val: data.jdText },
  };
}

async function saveProject(connection: oracledb.Connection, sql: string, binds: oracledb.BindParameters) {
  try {
    return await connection.execute(sql, binds);
  } catch (error) {
    if (error instanceof Error && "errorNum" in error && error.errorNum === 2291 &&
        error.message.includes("FK_FACE_PROJECT_OWNED_RESUME")) {
      throw new ApiError("E_RESUME_NOT_FOUND", "未找到所选简历", 404);
    }
    throw error;
  }
}

async function readDetail(connection: oracledb.Connection, ownerId: string, id: string) {
  const result = await connection.execute<unknown>(
    `SELECT ${summary}, resume_id AS "resumeId", jd_text AS "jdText" FROM ${table} WHERE ${owned}`,
    { ownerId, id },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      fetchTypeHandler: (column) => column.dbType === oracledb.DB_TYPE_CLOB ? { type: oracledb.STRING } : undefined,
    },
  );
  return projectDetailResponse.parse(requireProject(result.rows?.[0]));
}

async function readVersion(connection: oracledb.Connection, ownerId: string, id: string) {
  const result = await connection.execute<unknown>(
    `SELECT ${stamp("updated_at")} FROM ${table} WHERE ${owned}`,
    { ownerId, id },
    { outFormat: oracledb.OUT_FORMAT_ARRAY },
  );
  const [updatedAt] = z.tuple([z.iso.datetime({ precision: 6 })]).parse(requireProject(result.rows?.[0]));
  return updatedAt;
}

@Injectable()
export class ProjectsRepository {
  constructor(@Inject(OracleStore) private readonly db: OracleStore) {}

  listByOwner(ownerId: string) {
    return this.db.transaction(async (connection) => {
      const result = await connection.execute<unknown>(
        `SELECT ${summary} FROM ${table} WHERE owner_id = :ownerId ${order}`,
        { ownerId }, { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      return projectListResponse.parse(result.rows);
    });
  }

  summarizeByOwner(ownerId: string) {
    return this.db.transaction(async (connection) => {
      const result = await connection.execute<unknown>(
        `SELECT ${summary}, COUNT(*) OVER () AS "total" FROM ${table}
         WHERE owner_id = :ownerId ${order} FETCH FIRST 3 ROWS ONLY`,
        { ownerId }, { outFormat: oracledb.OUT_FORMAT_OBJECT },
      );
      const rows = z.array(z.record(z.string(), z.unknown())).parse(result.rows);
      const projects = summaryWithCount.parse(rows.map(({ total, ...project }) => ({ total, project })));
      return {
        projectCount: projects[0]?.total ?? 0,
        recentProjects: projectListResponse.parse(projects.map(({ project }) => project)),
      };
    });
  }

  findOwnedDetail(ownerId: string, id: string) {
    return this.db.transaction((connection) => readDetail(connection, ownerId, id));
  }

  insertOwnedProject(ownerId: string, data: ProjectSaveRequest) {
    const id = randomUUID();
    return this.db.transaction(async (connection) => {
      await saveProject(connection,
        `INSERT INTO ${table} (id, owner_id, target_role, target_company, resume_id, jd_text, created_at, updated_at)
         VALUES (:id, :ownerId, :targetRole, :targetCompany, :resumeId, :jdText, SYSTIMESTAMP, SYSTIMESTAMP)`,
        { id, ownerId, ...saveValues(data) },
      );
      return readDetail(connection, ownerId, id);
    });
  }

  replaceOwnedProject(ownerId: string, id: string, data: ProjectReplaceRequest) {
    return this.db.transaction(async (connection) => {
      const result = await saveProject(connection,
        `UPDATE ${table} SET target_role = :targetRole, target_company = :targetCompany,
         resume_id = :resumeId, jd_text = :jdText,
         updated_at = GREATEST(SYSTIMESTAMP, updated_at + NUMTODSINTERVAL(0.000001, 'SECOND'))
         WHERE ${owned} AND ${version}`,
        { ownerId, id, ...saveValues(data), expectedUpdatedAt: data.expectedUpdatedAt },
      );
      if (result.rowsAffected === 0) {
        await readVersion(connection, ownerId, id);
        throw new ApiError("E_PROJECT_CONFLICT", "项目已更新，请重新加载后再修改", 409);
      }
      return readDetail(connection, ownerId, id);
    });
  }

  findOwnedVersion(ownerId: string, id: string) {
    return this.db.transaction((connection) => readVersion(connection, ownerId, id));
  }

  deleteOwnedProjectVersion(ownerId: string, id: string, expectedUpdatedAt: string) {
    return this.db.transaction(async (connection) => {
      const result = await connection.execute(
        `DELETE FROM ${table} WHERE ${owned} AND ${version}`,
        { ownerId, id, expectedUpdatedAt },
      );
      if (result.rowsAffected === 0) {
        await readVersion(connection, ownerId, id);
        throw new ApiError("E_PROJECT_CONFLICT", "项目已更新，请重新确认删除", 409);
      }
    });
  }
}
