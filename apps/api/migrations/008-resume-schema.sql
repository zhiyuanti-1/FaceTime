-- CR-1.0-041：仅对已核验为空的 FREEPDB1.FACE_APP 执行一次。
-- 该文件不连接数据库、不切换容器。迁移成功后由执行方登记文件校验和。

CREATE TABLE FACE_APP.FACE_RESUME (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  owner_id VARCHAR2(36 CHAR) NOT NULL,
  full_name CLOB,
  gender_text CLOB,
  birth_date_text CLOB,
  phone CLOB,
  email CLOB,
  wechat_id CLOB,
  current_location CLOB,
  household_registration CLOB,
  political_status CLOB,
  ethnicity CLOB,
  desired_role CLOB,
  desired_industry CLOB,
  desired_city CLOB,
  desired_salary CLOB,
  availability_text CLOB,
  desired_employment_type CLOB,
  self_evaluation CLOB,
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_face_resume PRIMARY KEY (id)
);

CREATE INDEX FACE_APP.ix_face_resume_owner_updated
  ON FACE_APP.FACE_RESUME (owner_id, updated_at);

CREATE TABLE FACE_APP.FACE_RESUME_EDUCATION (
  resume_id VARCHAR2(36 CHAR) NOT NULL,
  sort_no NUMBER(2) NOT NULL,
  school_name CLOB,
  education_level CLOB,
  major CLOB,
  start_date_text CLOB,
  end_date_text CLOB,
  program_duration CLOB,
  study_mode CLOB,
  rank_text CLOB,
  CONSTRAINT pk_face_resume_education PRIMARY KEY (resume_id, sort_no),
  CONSTRAINT fk_face_resume_education FOREIGN KEY (resume_id) REFERENCES FACE_APP.FACE_RESUME (id),
  CONSTRAINT ck_face_resume_education_sort CHECK (sort_no BETWEEN 1 AND 40)
);

CREATE TABLE FACE_APP.FACE_RESUME_EMPLOYMENT (
  resume_id VARCHAR2(36 CHAR) NOT NULL,
  sort_no NUMBER(2) NOT NULL,
  company_name CLOB,
  employment_type CLOB,
  department_name CLOB,
  job_title CLOB,
  start_date_text CLOB,
  end_date_text CLOB,
  work_items_json CLOB NOT NULL,
  CONSTRAINT pk_face_resume_employment PRIMARY KEY (resume_id, sort_no),
  CONSTRAINT fk_face_resume_employment FOREIGN KEY (resume_id) REFERENCES FACE_APP.FACE_RESUME (id),
  CONSTRAINT ck_face_resume_employment_sort CHECK (sort_no BETWEEN 1 AND 40),
  CONSTRAINT ck_face_resume_employment_json CHECK (work_items_json IS JSON STRICT)
);

CREATE TABLE FACE_APP.FACE_RESUME_PROJECT (
  resume_id VARCHAR2(36 CHAR) NOT NULL,
  sort_no NUMBER(2) NOT NULL,
  project_name CLOB,
  start_date_text CLOB,
  end_date_text CLOB,
  duty_items_json CLOB NOT NULL,
  outcome_items_json CLOB NOT NULL,
  CONSTRAINT pk_face_resume_project PRIMARY KEY (resume_id, sort_no),
  CONSTRAINT fk_face_resume_project FOREIGN KEY (resume_id) REFERENCES FACE_APP.FACE_RESUME (id),
  CONSTRAINT ck_face_resume_project_sort CHECK (sort_no BETWEEN 1 AND 40),
  CONSTRAINT ck_face_resume_project_duty CHECK (duty_items_json IS JSON STRICT),
  CONSTRAINT ck_face_resume_project_outcome CHECK (outcome_items_json IS JSON STRICT)
);

CREATE TABLE FACE_APP.FACE_RESUME_CAMPUS (
  resume_id VARCHAR2(36 CHAR) NOT NULL,
  sort_no NUMBER(2) NOT NULL,
  organization_name CLOB,
  position_title CLOB,
  work_items_json CLOB NOT NULL,
  CONSTRAINT pk_face_resume_campus PRIMARY KEY (resume_id, sort_no),
  CONSTRAINT fk_face_resume_campus FOREIGN KEY (resume_id) REFERENCES FACE_APP.FACE_RESUME (id),
  CONSTRAINT ck_face_resume_campus_sort CHECK (sort_no BETWEEN 1 AND 40),
  CONSTRAINT ck_face_resume_campus_json CHECK (work_items_json IS JSON STRICT)
);

CREATE TABLE FACE_APP.FACE_RESUME_LANGUAGE (
  resume_id VARCHAR2(36 CHAR) NOT NULL,
  sort_no NUMBER(2) NOT NULL,
  language_name CLOB,
  proficiency_text CLOB,
  CONSTRAINT pk_face_resume_language PRIMARY KEY (resume_id, sort_no),
  CONSTRAINT fk_face_resume_language FOREIGN KEY (resume_id) REFERENCES FACE_APP.FACE_RESUME (id),
  CONSTRAINT ck_face_resume_language_sort CHECK (sort_no BETWEEN 1 AND 40)
);

CREATE TABLE FACE_APP.FACE_RESUME_LIST_ITEM (
  resume_id VARCHAR2(36 CHAR) NOT NULL,
  sort_no NUMBER(2) NOT NULL,
  item_kind VARCHAR2(5 CHAR) NOT NULL,
  item_text CLOB NOT NULL,
  CONSTRAINT pk_face_resume_list_item PRIMARY KEY (resume_id, item_kind, sort_no),
  CONSTRAINT fk_face_resume_list_item FOREIGN KEY (resume_id) REFERENCES FACE_APP.FACE_RESUME (id),
  CONSTRAINT ck_face_resume_list_item_kind CHECK (item_kind IN ('SKILL', 'HOBBY', 'OTHER')),
  CONSTRAINT ck_face_resume_list_item_sort CHECK (sort_no BETWEEN 1 AND 40)
);

CREATE TABLE FACE_APP.FACE_MIGRATIONS (
  version VARCHAR2(40 CHAR) NOT NULL,
  checksum_sha256 CHAR(64 BYTE) NOT NULL,
  applied_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_face_migrations PRIMARY KEY (version)
);
