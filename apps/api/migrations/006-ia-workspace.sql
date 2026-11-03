-- CR-1.0-012 additive migration. Run in FREEPDB1 as FACE_APP owner context.
CREATE TABLE face_preferences (
 user_id VARCHAR2(36 CHAR) NOT NULL,
 preferences_json CLOB NOT NULL,
 updated_at TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
 CONSTRAINT pk_face_preferences PRIMARY KEY(user_id),
 CONSTRAINT fk_preferences_user FOREIGN KEY(user_id) REFERENCES face_users(id),
 CONSTRAINT ck_preferences_json CHECK(preferences_json IS JSON STRICT WITH UNIQUE KEYS)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON face_preferences TO face_runtime;
ALTER TABLE face_resumes ADD file_size_bytes NUMBER(15) DEFAULT 0 NOT NULL;
ALTER TABLE face_resumes ADD CONSTRAINT ck_resume_file_size CHECK(file_size_bytes>=0);
