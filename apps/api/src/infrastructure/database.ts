import { Injectable } from "@nestjs/common";
import { DataSource, type QueryRunner } from "typeorm";
import oracledb from "oracledb";
import { z } from "zod";
import { config } from "../config.js";
oracledb.fetchAsString = [oracledb.CLOB];
@Injectable()
export class OracleStore {
  readonly source = new DataSource({
    type: "oracle",
    driver: oracledb,
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    connectString: config.DB_CONNECT_STRING,
    schema: config.DB_SCHEMA,
    entities: [],
    synchronize: false,
    logging: false,
    extra: { poolMin: 1, poolMax: 4 },
  });
  private readiness: Promise<void> | undefined;
  async ready() {
    this.readiness ??= this.source.initialize().then(() => undefined);
    await this.readiness;
  }
  async onModuleInit() {
    await this.ready();
  }
  async onModuleDestroy() {
    if (this.source.isInitialized) await this.source.destroy();
  }
  async rows<T>(
    sql: string,
    params: unknown[],
    schema: z.ZodType<T>,
    runner?: QueryRunner,
  ): Promise<T[]> {
    await this.ready();
    const raw: unknown = await (runner
      ? runner.query(sql, params)
      : this.source.query(sql, params));
    return z.array(schema).parse(raw);
  }
  async execute(sql: string, params: unknown[] = [], runner?: QueryRunner) {
    await this.ready();
    await (runner ? runner.query(sql, params) : this.source.query(sql, params));
  }
  async transaction<T>(fn: (runner: QueryRunner) => Promise<T>): Promise<T> {
    await this.ready();
    const runner = this.source.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      const result = await fn(runner);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}
