import { z } from "zod";
const resumeField = z.string().max(2000).nullable();
const resumeItems = z.array(z.string().max(2000)).max(40);

function createResumeFields() {
  return z.strictObject({
    基本信息: z.strictObject({
      姓名: resumeField,
      性别: resumeField,
      出生日期: resumeField,
      电话: resumeField,
      邮箱: resumeField,
      微信号: resumeField,
      现居: resumeField,
      户籍: resumeField,
      政治面貌: resumeField,
      民族: resumeField,
    }),
    求职意向: z.strictObject({
      岗位: resumeField,
      行业: resumeField,
      城市: resumeField,
      薪资: resumeField,
      到岗时间: resumeField,
      工作类型: resumeField,
    }),
    教育经历: z
      .array(
        z.strictObject({
          学校: resumeField,
          学历: resumeField,
          专业: resumeField,
          开始: resumeField,
          结束: resumeField,
          学制: resumeField,
          学习形式: resumeField,
          排名: resumeField,
        }),
      )
      .max(40),
    "实习/工作经历": z
      .array(
        z.strictObject({
          公司名: resumeField,
          工作类型: resumeField,
          部门: resumeField,
          职位: resumeField,
          开始: resumeField,
          结束: resumeField,
          主要工作内容: resumeItems,
        }),
      )
      .max(40),
    项目经历: z
      .array(
        z.strictObject({
          项目名称: resumeField,
          开始: resumeField,
          结束: resumeField,
          职责: resumeItems,
          成果: resumeItems,
        }),
      )
      .max(40),
    校园经历: z
      .array(
        z.strictObject({
          组织名称: resumeField,
          职位: resumeField,
          主要工作内容: resumeItems,
        }),
      )
      .max(40),
    技能: resumeItems,
    自我评价: resumeField,
    语言能力: z
      .array(z.strictObject({ 语言: resumeField, 等级: resumeField }))
      .max(40),
    爱好: resumeItems,
    其他: resumeItems,
  });
}
export const resumeFields = createResumeFields();
export const resumeModelFields = resumeFields;
export type ResumeFields = z.infer<typeof resumeFields>;
