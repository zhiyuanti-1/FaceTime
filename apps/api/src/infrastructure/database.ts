import { Injectable } from "@nestjs/common";
import oracledb from "oracledb";
import { config } from "../config.js";
import { ApiError } from "./http.js";

@Injectable()
export class OracleStore {
  async transaction<T>(work: (connection: oracledb.Connection) => Promise<T>) {
    const { DB_USER, DB_SCHEMA, DB_PASSWORD, DB_CONNECT_STRING } = config;
    if (!DB_USER || !DB_SCHEMA || !DB_PASSWORD || !DB_CONNECT_STRING) {
      throw new ApiError("E_DB_CONFIG", "请先配置本机 Oracle 应用连接", 503);
    }
    let connection: oracledb.Connection;
    try {
      connection = await oracledb.getConnection({
        user: DB_USER,
        password: DB_PASSWORD,
        connectString: DB_CONNECT_STRING,
      });
    } catch {
      throw new ApiError(
        "E_DB_CONNECTION",
        "无法连接本机 Oracle，请检查服务和应用连接配置",
        503,
      );
    }
    try {
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.close();
    }
  }
}
