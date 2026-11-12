-- CR-1.0-050：在已核验的 FREEPDB1.FACE_APP 上执行。
-- 迁移成功后由执行方登记文件校验和。

ALTER TABLE FACE_APP.FACE_RESUME ADD CONSTRAINT uq_face_resume_owner_id
  UNIQUE (owner_id, id);

CREATE TABLE FACE_APP.FACE_PROJECT (
  id VARCHAR2(36 CHAR) NOT NULL,
  owner_id VARCHAR2(36 CHAR) NOT NULL,
  target_role VARCHAR2(200 CHAR) NOT NULL,
  target_company VARCHAR2(200 CHAR),
  resume_id VARCHAR2(36 CHAR) NOT NULL,
  jd_text CLOB NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  CONSTRAINT pk_face_project PRIMARY KEY (id),
  CONSTRAINT fk_face_project_owned_resume FOREIGN KEY (owner_id, resume_id)
    REFERENCES FACE_APP.FACE_RESUME (owner_id, id)
);

CREATE INDEX FACE_APP.ix_face_project_owner_updated
  ON FACE_APP.FACE_PROJECT (owner_id, updated_at, id);

CREATE INDEX FACE_APP.ix_face_project_owner_resume
  ON FACE_APP.FACE_PROJECT (owner_id, resume_id);

GRANT SELECT, INSERT, UPDATE ON FACE_APP.FACE_PROJECT TO FACE_RUNTIME;
