import { resumeDetailResponse, resumeFields, resumeListResponse, type ResumeDetail, type ResumeFields, type ResumeSummary } from "@face/shared";
import { z } from "zod";

const basic = {
  full_name: "姓名",
  gender_text: "性别",
  birth_date_text: "出生日期",
  phone: "电话",
  email: "邮箱",
  wechat_id: "微信号",
  current_location: "现居",
  household_registration: "户籍",
  political_status: "政治面貌",
  ethnicity: "民族",
} as const;
const intention = {
  desired_role: "岗位",
  desired_industry: "行业",
  desired_city: "城市",
  desired_salary: "薪资",
  availability_text: "到岗时间",
  desired_employment_type: "工作类型",
} as const;

export const sections = {
  教育经历: {
    table: "FACE_RESUME_EDUCATION",
    text: {
      school_name: "学校",
      education_level: "学历",
      major: "专业",
      start_date_text: "开始",
      end_date_text: "结束",
      program_duration: "学制",
      study_mode: "学习形式",
      rank_text: "排名",
    },
    arrays: {},
  },
  "实习/工作经历": {
    table: "FACE_RESUME_EMPLOYMENT",
    text: {
      company_name: "公司名",
      employment_type: "工作类型",
      department_name: "部门",
      job_title: "职位",
      start_date_text: "开始",
      end_date_text: "结束",
    },
    arrays: { work_items_json: "主要工作内容" },
  },
  项目经历: {
    table: "FACE_RESUME_PROJECT",
    text: {
      project_name: "项目名称",
      start_date_text: "开始",
      end_date_text: "结束",
    },
    arrays: { duty_items_json: "职责", outcome_items_json: "成果" },
  },
  校园经历: {
    table: "FACE_RESUME_CAMPUS",
    text: { organization_name: "组织名称", position_title: "职位" },
    arrays: { work_items_json: "主要工作内容" },
  },
  语言能力: {
    table: "FACE_RESUME_LANGUAGE",
    text: { language_name: "语言", proficiency_text: "等级" },
    arrays: {},
  },
} as const;

export const sectionNames = [
  "教育经历",
  "实习/工作经历",
  "项目经历",
  "校园经历",
  "语言能力",
] as const;
export const listKinds = {
  技能: "SKILL",
  爱好: "HOBBY",
  其他: "OTHER",
} as const;
export const listNames = ["技能", "爱好", "其他"] as const;

type TextRow = Record<string, string | null>;
type FieldMap = Record<string, string>;
type Section = (typeof sections)[keyof typeof sections];

function toColumns<T>(values: Record<string, T>, map: FieldMap) {
  return Object.fromEntries(
    Object.entries(map).map(([column, field]) => [column, values[field]]),
  );
}

function toFields(row: TextRow, map: FieldMap) {
  return Object.fromEntries(
    Object.entries(map).map(([column, field]) => [field, row[column]]),
  );
}

export const mainColumns = [
  ...Object.keys(basic),
  ...Object.keys(intention),
  "self_evaluation",
];

export function toMainRow(value: ResumeFields): TextRow {
  return {
    ...toColumns(value.基本信息, basic),
    ...toColumns(value.求职意向, intention),
    self_evaluation: value.自我评价,
  };
}

export function toSectionRow(
  section: Section,
  value: Record<string, string | string[] | null>,
): TextRow {
  const text = toColumns(value, section.text);
  const arrays = toColumns(value, section.arrays);
  return {
    ...z.record(z.string(), z.string().nullable()).parse(text),
    ...Object.fromEntries(
      Object.entries(arrays).map(([column, items]) => [
        column,
        JSON.stringify(items),
      ]),
    ),
  };
}

export function toSectionFields(section: Section, row: TextRow) {
  const arrays = toFields(row, section.arrays);
  return {
    ...toFields(row, section.text),
    ...Object.fromEntries(
      Object.entries(arrays).map(([name, json]) => {
        const parsed: unknown = JSON.parse(z.string().parse(json));
        return [name, parsed];
      }),
    ),
  };
}

function toResumeFields(
  main: TextRow,
  details: Record<string, unknown>,
) {
  return resumeFields.parse({
    ...details,
    基本信息: toFields(main, basic),
    求职意向: toFields(main, intention),
    自我评价: main.self_evaluation,
  });
}

export function toResumeList(rows: unknown): readonly ResumeSummary[] {
  return resumeListResponse.parse(rows);
}

export function toResumeDetail(main: TextRow, details: Record<string, unknown>): ResumeDetail {
  return resumeDetailResponse.parse({
    id: main.id,
    createdAt: main.createdAt,
    updatedAt: main.updatedAt,
    fields: toResumeFields(main, details),
  });
}
