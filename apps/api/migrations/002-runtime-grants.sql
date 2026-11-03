-- DBA only, after FREEPDB1/FACE_APP target confirmation and runtime account creation.
-- FACE_APP owns objects but has NO AUTHENTICATION. Backend uses FACE_RUNTIME only.
whenever sqlerror exit sql.sqlcode rollback
BEGIN
  IF SYS_CONTEXT('USERENV','CON_NAME') <> 'FREEPDB1' THEN
    RAISE_APPLICATION_ERROR(-20010, 'Expected FREEPDB1');
  END IF;
END;
/
GRANT SELECT, INSERT, UPDATE, DELETE ON face_app.face_resumes TO face_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON face_app.face_sessions TO face_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON face_app.face_turns TO face_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON face_app.face_audio_assets TO face_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON face_app.face_rule_events TO face_runtime;
GRANT SELECT, INSERT ON face_app.face_reports TO face_runtime;
-- Reports delete is required for a complete user-requested purge; no UPDATE grant.
GRANT DELETE ON face_app.face_reports TO face_runtime;
GRANT SELECT, INSERT ON face_app.face_audit_logs TO face_runtime;
GRANT SELECT ON face_app.face_migrations TO face_runtime;
