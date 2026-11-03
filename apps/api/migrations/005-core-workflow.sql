-- CR-1.0-011. Additive migration; do not run 001 again.
set define off
whenever sqlerror exit sql.sqlcode rollback
DECLARE n NUMBER; BEGIN
 IF SYS_CONTEXT('USERENV','CON_NAME') <> 'FREEPDB1' OR SYS_CONTEXT('USERENV','CURRENT_SCHEMA') <> 'FACE_APP' THEN RAISE_APPLICATION_ERROR(-20041,'Wrong target'); END IF;
 SELECT COUNT(*) INTO n FROM all_tables WHERE owner='FACE_APP' AND table_name='FACE_USERS';
 IF n<>0 THEN RAISE_APPLICATION_ERROR(-20042,'005 already exists; inspect ledger'); END IF;
 SELECT (SELECT COUNT(*) FROM face_resumes)+(SELECT COUNT(*) FROM face_sessions) INTO n FROM dual;
 IF n<>0 THEN RAISE_APPLICATION_ERROR(-20043,'Existing local rows need an explicit owner backfill before 005'); END IF;
END;
/
CREATE TABLE face_users (
 id VARCHAR2(36 CHAR) NOT NULL,
 username VARCHAR2(64 CHAR) NOT NULL,
 password_hash VARCHAR2(256 CHAR) NOT NULL,
 created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
 CONSTRAINT pk_face_users PRIMARY KEY(id),
 CONSTRAINT uq_face_username UNIQUE(username)
);
CREATE TABLE face_auth_sessions (
 token_hash CHAR(64 BYTE) NOT NULL,
 user_id VARCHAR2(36 CHAR) NOT NULL,
 expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
 created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
 CONSTRAINT pk_face_auth PRIMARY KEY(token_hash),
 CONSTRAINT fk_auth_user FOREIGN KEY(user_id) REFERENCES face_users(id)
);
CREATE INDEX ix_auth_user ON face_auth_sessions(user_id);
ALTER TABLE face_resumes ADD (
 owner_id VARCHAR2(36 CHAR) NOT NULL,
 original_filename VARCHAR2(255 CHAR),
 original_path VARCHAR2(512 CHAR),
 edited_text CLOB,
 ocr_pages_json CLOB,
 extraction_method VARCHAR2(30 CHAR),
 extraction_status VARCHAR2(16 CHAR) DEFAULT 'ready' NOT NULL,
 extraction_error VARCHAR2(80 CHAR)
);
ALTER TABLE face_resumes ADD CONSTRAINT fk_resume_owner FOREIGN KEY(owner_id) REFERENCES face_users(id);
ALTER TABLE face_resumes ADD CONSTRAINT ck_resume_pages CHECK(ocr_pages_json IS JSON STRICT);
ALTER TABLE face_resumes ADD CONSTRAINT ck_resume_extract CHECK(extraction_status IN ('processing','ready','failed'));
ALTER TABLE face_resumes DROP CONSTRAINT ck_resume_source;
ALTER TABLE face_resumes ADD CONSTRAINT ck_resume_source CHECK(source_kind IN ('pdf','docx','doc','txt','image','paste'));
CREATE INDEX ix_resume_owner ON face_resumes(owner_id,created_at);
ALTER TABLE face_sessions ADD owner_id VARCHAR2(36 CHAR) NOT NULL;
ALTER TABLE face_sessions ADD CONSTRAINT fk_session_owner FOREIGN KEY(owner_id) REFERENCES face_users(id);
CREATE INDEX ix_session_owner ON face_sessions(owner_id,updated_at);
CREATE TABLE face_topics (
 id VARCHAR2(40 CHAR) NOT NULL,
 name VARCHAR2(100 CHAR) NOT NULL,
 stage VARCHAR2(12 CHAR) NOT NULL,
 CONSTRAINT pk_face_topics PRIMARY KEY(id),
 CONSTRAINT ck_topic_stage CHECK(stage IN ('seed','curated'))
);
CREATE TABLE face_questions (
 id VARCHAR2(64 CHAR) NOT NULL,
 topic_id VARCHAR2(40 CHAR) NOT NULL,
 question_text VARCHAR2(1000 CHAR) NOT NULL,
 difficulty NUMBER(1) NOT NULL,
 expected_points_json CLOB NOT NULL,
 verified NUMBER(1) DEFAULT 0 NOT NULL,
 CONSTRAINT pk_face_questions PRIMARY KEY(id),
 CONSTRAINT fk_question_topic FOREIGN KEY(topic_id) REFERENCES face_topics(id),
 CONSTRAINT ck_question_difficulty CHECK(difficulty IN (1,2,3)),
 CONSTRAINT ck_question_points CHECK(expected_points_json IS JSON STRICT),
 CONSTRAINT ck_question_verified CHECK(verified IN (0,1))
);
CREATE INDEX ix_question_topic ON face_questions(topic_id,difficulty);
GRANT SELECT,INSERT,UPDATE ON face_users TO face_runtime;
GRANT SELECT,INSERT,UPDATE,DELETE ON face_auth_sessions TO face_runtime;
GRANT SELECT,INSERT ON face_topics TO face_runtime;
GRANT SELECT,INSERT ON face_questions TO face_runtime;
COMMENT ON TABLE face_users IS 'Application identities; passwords are scrypt hashes only';
COMMENT ON TABLE face_auth_sessions IS 'SHA256 token hashes; never raw session cookies';
COMMENT ON TABLE face_topics IS 'Shared question topics; not private user content';
COMMENT ON TABLE face_questions IS 'Server-side question bank; source seed content is unverified';
