import type { ResumeDetail, ResumeFields } from "@face/shared";

export const emptyResume: ResumeFields = {
  基本信息: {
    姓名: null, 性别: null, 出生日期: null, 电话: null, 邮箱: null,
    微信号: null, 现居: null, 户籍: null, 政治面貌: null, 民族: null,
  },
  求职意向: { 岗位: null, 行业: null, 城市: null, 薪资: null, 到岗时间: null, 工作类型: null },
  教育经历: [],
  "实习/工作经历": [],
  项目经历: [],
  校园经历: [],
  语言能力: [],
  技能: [],
  自我评价: null,
  爱好: [],
  其他: [],
};

export type ResumeDrawerState =
  | { kind: "closed" }
  | { kind: "import" }
  | { kind: "loading" | "failed"; id: string }
  | { kind: "view" | "delete"; record: ResumeDetail }
  | { kind: "edit"; record?: ResumeDetail; draft?: ResumeFields; rawText?: string };
