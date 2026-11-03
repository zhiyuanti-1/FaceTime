-- Face 1.0 / Oracle 26ai Free; reviewed target: FREEPDB1 / FACE_APP.
-- NO account creation and NO credentials in this file.
-- Run only after explicit target confirmation and schema provisioning.
-- Oracle DDL auto-commits; failure may leave partial objects. Never rerun blindly.
set define off
set echo off
set feedback on
whenever oserror exit failure rollback
whenever sqlerror exit sql.sqlcode rollback

DECLARE
  v_count NUMBER;
BEGIN
  IF SYS_CONTEXT('USERENV', 'CON_NAME') <> 'FREEPDB1'
     OR SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') <> 'FACE_APP' THEN
    RAISE_APPLICATION_ERROR(-20001, 'Expected FREEPDB1 and CURRENT_SCHEMA=FACE_APP');
  END IF;
  SELECT COUNT(*) INTO v_count FROM all_tables
    WHERE owner = 'FACE_APP' AND table_name IN (
      'FACE_RESUMES', 'FACE_SESSIONS', 'FACE_TURNS', 'FACE_AUDIO_ASSETS',
      'FACE_RULE_EVENTS', 'FACE_REPORTS', 'FACE_AUDIT_LOGS', 'FACE_MIGRATIONS');
  IF v_count <> 0 THEN
    RAISE_APPLICATION_ERROR(-20002, 'Initial objects already exist; inspect migration state');
  END IF;
END;
/

CREATE TABLE face_resumes (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  source_kind VARCHAR2(12 CHAR) NOT NULL,
  raw_text CLOB,
  profile_json CLOB,
  suspicions_json CLOB,
  uncertain_fields_json CLOB,
  parse_confidence NUMBER(4,3),
  needs_review NUMBER(1) DEFAULT 1 NOT NULL,
  schema_version NUMBER(6) DEFAULT 1 NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  delete_requested_at TIMESTAMP(6) WITH TIME ZONE,
  CONSTRAINT pk_face_resumes PRIMARY KEY (id),
  CONSTRAINT ck_resume_source CHECK (source_kind IN ('pdf','image','paste')),
  CONSTRAINT ck_resume_profile CHECK (profile_json IS JSON STRICT WITH UNIQUE KEYS),
  CONSTRAINT ck_resume_suspicions CHECK (suspicions_json IS JSON STRICT),
  CONSTRAINT ck_resume_uncertain CHECK (uncertain_fields_json IS JSON STRICT),
  CONSTRAINT ck_resume_conf CHECK (parse_confidence BETWEEN 0 AND 1),
  CONSTRAINT ck_resume_review CHECK (needs_review IN (0,1)),
  CONSTRAINT ck_resume_schema CHECK (schema_version >= 1)
);

CREATE TABLE face_sessions (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  resume_id VARCHAR2(36 CHAR),
  job_profile_json CLOB NOT NULL,
  paper_json CLOB NOT NULL,
  versions_json CLOB NOT NULL,
  status VARCHAR2(20 CHAR) DEFAULT 'idle' NOT NULL,
  current_index NUMBER(6) DEFAULT 0 NOT NULL,
  lock_version NUMBER(10) DEFAULT 0 NOT NULL,
  warnings_json CLOB DEFAULT '[]' NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  finished_at TIMESTAMP(6) WITH TIME ZONE,
  delete_requested_at TIMESTAMP(6) WITH TIME ZONE,
  CONSTRAINT pk_face_sessions PRIMARY KEY (id),
  CONSTRAINT fk_session_resume FOREIGN KEY (resume_id) REFERENCES face_resumes(id),
  CONSTRAINT ck_session_job CHECK (job_profile_json IS JSON STRICT WITH UNIQUE KEYS),
  CONSTRAINT ck_session_paper CHECK (paper_json IS JSON STRICT WITH UNIQUE KEYS),
  CONSTRAINT ck_session_versions CHECK (versions_json IS JSON STRICT WITH UNIQUE KEYS),
  CONSTRAINT ck_session_warnings CHECK (warnings_json IS JSON STRICT),
  CONSTRAINT ck_session_status CHECK (status IN ('idle','preparing','ready','asking',
    'answering','transcribing','scoring','followup','finished','failed')),
  CONSTRAINT ck_session_index CHECK (current_index >= 0),
  CONSTRAINT ck_session_lock CHECK (lock_version >= 0)
);

CREATE TABLE face_turns (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  session_id VARCHAR2(36 CHAR) NOT NULL,
  turn_index NUMBER(6) NOT NULL,
  question_json CLOB NOT NULL,
  answer_text CLOB,
  duration_ms NUMBER(12),
  transcripts_json CLOB DEFAULT '[]' NOT NULL,
  followups_json CLOB DEFAULT '[]' NOT NULL,
  ai_result_json CLOB,
  score_json CLOB,
  status VARCHAR2(20 CHAR) DEFAULT 'pending' NOT NULL,
  request_key VARCHAR2(128 CHAR),
  answer_revision NUMBER(8) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  updated_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_face_turns PRIMARY KEY (id),
  CONSTRAINT fk_turn_session FOREIGN KEY (session_id) REFERENCES face_sessions(id),
  CONSTRAINT uq_turn_index UNIQUE (session_id, turn_index),
  CONSTRAINT uq_turn_session_id UNIQUE (session_id, id),
  CONSTRAINT uq_turn_request UNIQUE (session_id, request_key),
  CONSTRAINT ck_turn_index CHECK (turn_index >= 0),
  CONSTRAINT ck_turn_duration CHECK (duration_ms >= 0),
  CONSTRAINT ck_turn_revision CHECK (answer_revision >= 0),
  CONSTRAINT ck_turn_question CHECK (question_json IS JSON STRICT WITH UNIQUE KEYS),
  CONSTRAINT ck_turn_transcript CHECK (transcripts_json IS JSON STRICT),
  CONSTRAINT ck_turn_followups CHECK (followups_json IS JSON STRICT),
  CONSTRAINT ck_turn_ai CHECK (ai_result_json IS JSON STRICT WITH UNIQUE KEYS),
  CONSTRAINT ck_turn_score CHECK (score_json IS JSON STRICT WITH UNIQUE KEYS),
  CONSTRAINT ck_turn_status CHECK (status IN ('pending','answered','transcribed',
    'scored','needs_review','skipped'))
);

CREATE TABLE face_audio_assets (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  session_id VARCHAR2(36 CHAR) NOT NULL,
  turn_id VARCHAR2(36 CHAR) NOT NULL,
  followup_index NUMBER(2),
  relative_path VARCHAR2(512 CHAR) NOT NULL,
  mime_type VARCHAR2(80 CHAR) NOT NULL,
  size_bytes NUMBER(15) NOT NULL,
  sha256 CHAR(64 BYTE),
  status VARCHAR2(12 CHAR) DEFAULT 'staged' NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP(6) WITH TIME ZONE,
  CONSTRAINT pk_face_audio PRIMARY KEY (id),
  CONSTRAINT fk_audio_turn FOREIGN KEY (session_id,turn_id)
    REFERENCES face_turns(session_id,id),
  CONSTRAINT uq_audio_path UNIQUE (relative_path),
  CONSTRAINT ck_audio_followup CHECK (followup_index IN (1,2)),
  CONSTRAINT ck_audio_size CHECK (size_bytes >= 0),
  CONSTRAINT ck_audio_path CHECK (relative_path NOT LIKE '/%'
    AND INSTR(relative_path,'..') = 0 AND INSTR(relative_path,CHR(92)) = 0
    AND INSTR(relative_path,':') = 0),
  CONSTRAINT ck_audio_status CHECK (status IN ('staged','ready','deleting','deleted','failed')),
  CONSTRAINT ck_audio_expiry CHECK (expires_at >= created_at)
);

CREATE TABLE face_rule_events (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  turn_id VARCHAR2(36 CHAR) NOT NULL,
  event_key VARCHAR2(128 CHAR) NOT NULL,
  event_kind VARCHAR2(12 CHAR) NOT NULL,
  rule_id VARCHAR2(40 CHAR) NOT NULL,
  scoring_version VARCHAR2(40 CHAR) NOT NULL,
  dimension VARCHAR2(12 CHAR) NOT NULL,
  points NUMBER(8,3) NOT NULL,
  occurred_at_ms NUMBER(12),
  actual_value NUMBER(18,6),
  threshold_value NUMBER(18,6),
  unit VARCHAR2(40 CHAR),
  evidence VARCHAR2(1000 CHAR),
  confidence NUMBER(4,3),
  confidence_source VARCHAR2(12 CHAR),
  status VARCHAR2(20 CHAR) NOT NULL,
  rule_snapshot_json CLOB,
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_face_events PRIMARY KEY (id),
  CONSTRAINT fk_event_turn FOREIGN KEY (turn_id) REFERENCES face_turns(id),
  CONSTRAINT uq_event_key UNIQUE (turn_id,event_key),
  CONSTRAINT ck_event_kind CHECK (event_kind IN ('DEDUCTION','BONUS')),
  CONSTRAINT ck_event_dimension CHECK (dimension IN ('CONTENT','FLUENCY','FILLER','BODY','RESUME','FIT')),
  CONSTRAINT ck_event_points CHECK (points > 0),
  CONSTRAINT ck_event_time CHECK (occurred_at_ms >= 0),
  CONSTRAINT ck_event_conf CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT ck_event_conf_src CHECK ((confidence IS NULL AND confidence_source IS NULL)
    OR (confidence IS NOT NULL AND confidence_source IS NOT NULL
      AND confidence_source IN ('api','model'))),
  CONSTRAINT ck_event_status CHECK (status IN ('APPLIED','WAIVED','INCONCLUSIVE','PENDING_REVIEW')),
  CONSTRAINT ck_event_evidence CHECK (status <> 'APPLIED' OR TRIM(evidence) IS NOT NULL),
  CONSTRAINT ck_event_snapshot CHECK (rule_snapshot_json IS JSON STRICT WITH UNIQUE KEYS)
);

CREATE TABLE face_reports (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  session_id VARCHAR2(36 CHAR) NOT NULL,
  revision NUMBER(8) NOT NULL,
  score_kind VARCHAR2(12 CHAR),
  total_score NUMBER(4,1),
  range_low NUMBER(4,1),
  range_high NUMBER(4,1),
  coverage NUMBER(5,4) NOT NULL,
  payload_json CLOB NOT NULL,
  scoring_version VARCHAR2(40 CHAR) NOT NULL,
  prompt_version VARCHAR2(40 CHAR) NOT NULL,
  bank_version VARCHAR2(40 CHAR) NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_face_reports PRIMARY KEY (id),
  CONSTRAINT fk_report_session FOREIGN KEY (session_id) REFERENCES face_sessions(id),
  CONSTRAINT uq_report_revision UNIQUE (session_id,revision),
  CONSTRAINT ck_report_revision CHECK (revision >= 1),
  CONSTRAINT ck_report_coverage CHECK (coverage BETWEEN 0 AND 1),
  CONSTRAINT ck_report_score CHECK (total_score BETWEEN 0 AND 100),
  CONSTRAINT ck_report_range CHECK (range_low BETWEEN 0 AND 100 AND range_high BETWEEN 0 AND 100 AND range_low <= range_high),
  CONSTRAINT ck_report_shape CHECK (
    (score_kind IS NULL AND total_score IS NULL AND range_low IS NULL AND range_high IS NULL)
    OR (score_kind IS NOT NULL AND score_kind = 'point' AND total_score IS NOT NULL
      AND range_low IS NULL AND range_high IS NULL)
    OR (score_kind IS NOT NULL AND score_kind = 'interval' AND total_score IS NULL
      AND range_low IS NOT NULL AND range_high IS NOT NULL)),
  CONSTRAINT ck_report_payload CHECK (payload_json IS JSON STRICT WITH UNIQUE KEYS)
);

CREATE TABLE face_audit_logs (
  id VARCHAR2(36 CHAR) DEFAULT LOWER(RAWTOHEX(SYS_GUID())) NOT NULL,
  request_id VARCHAR2(64 CHAR),
  actor_kind VARCHAR2(12 CHAR) DEFAULT 'local' NOT NULL,
  action VARCHAR2(64 CHAR) NOT NULL,
  resource_kind VARCHAR2(40 CHAR),
  resource_id VARCHAR2(36 CHAR),
  outcome VARCHAR2(12 CHAR) NOT NULL,
  error_code VARCHAR2(64 CHAR),
  created_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_face_audit PRIMARY KEY (id),
  CONSTRAINT ck_audit_actor CHECK (actor_kind IN ('local','system')),
  CONSTRAINT ck_audit_outcome CHECK (outcome IN ('success','failure'))
);

CREATE TABLE face_migrations (
  version VARCHAR2(40 CHAR) NOT NULL,
  checksum_sha256 CHAR(64 BYTE) NOT NULL,
  applied_at TIMESTAMP(6) WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
  CONSTRAINT pk_face_migrations PRIMARY KEY (version)
);

CREATE INDEX ix_resume_created ON face_resumes(created_at);
CREATE INDEX ix_resume_delete ON face_resumes(delete_requested_at);
CREATE INDEX ix_session_resume ON face_sessions(resume_id);
CREATE INDEX ix_session_status ON face_sessions(status,updated_at);
CREATE INDEX ix_session_created ON face_sessions(created_at);
CREATE INDEX ix_session_delete ON face_sessions(delete_requested_at);
CREATE INDEX ix_audio_turn ON face_audio_assets(session_id,turn_id);
CREATE INDEX ix_audio_expiry ON face_audio_assets(status,expires_at);
CREATE INDEX ix_event_turn ON face_rule_events(turn_id,status);
CREATE INDEX ix_audit_created ON face_audit_logs(created_at);

COMMENT ON TABLE face_resumes IS 'Resume text and confirmed structure; sensitive local data';
COMMENT ON TABLE face_sessions IS 'Local single-user sessions; no application accounts in v1';
COMMENT ON TABLE face_turns IS 'Question/answer snapshots; zero-based turn index';
COMMENT ON TABLE face_audio_assets IS 'Disk file metadata; no audio bytes or public file URL';
COMMENT ON TABLE face_rule_events IS 'Positive points; kind determines deduction or bonus';
COMMENT ON TABLE face_reports IS 'Immutable revision snapshots; NULL scores are never zero-filled';
COMMENT ON TABLE face_audit_logs IS 'Minimal audit metadata; no resume, transcript, secret or audio';
COMMENT ON TABLE face_migrations IS 'Manually applied migration checksum history';

-- Apply script records the exact SHA-256 in FACE_MIGRATIONS after verification.
-- No sample resumes, accounts, audio, model output or credentials are inserted.
