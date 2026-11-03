-- Synthetic constraint tests; every DML row is rolled back. Run as FACE_RUNTIME.
set echo off verify off feedback off serveroutput on
whenever sqlerror exit sql.sqlcode rollback
DECLARE
  n NUMBER;
  PROCEDURE rejects(p_sql VARCHAR2, p_expected NUMBER, p_label VARCHAR2) IS
    v_rejected BOOLEAN := FALSE;
  BEGIN
    BEGIN EXECUTE IMMEDIATE p_sql;
    EXCEPTION WHEN OTHERS THEN
      IF SQLCODE <> p_expected AND NOT (p_expected = -1031 AND SQLCODE = -41900) THEN RAISE; END IF;
      v_rejected := TRUE;
    END;
    IF NOT v_rejected THEN RAISE_APPLICATION_ERROR(-20030,'Constraint not enforced: '||p_label); END IF;
    DBMS_OUTPUT.PUT_LINE('PASS '||p_label);
  END;
BEGIN
  IF SYS_CONTEXT('USERENV','CON_NAME') <> 'FREEPDB1'
    OR SYS_CONTEXT('USERENV','SESSION_USER') <> 'FACE_RUNTIME' THEN
    RAISE_APPLICATION_ERROR(-20031,'Expected FACE_RUNTIME connection to FREEPDB1');
  END IF;
  SELECT COUNT(*) INTO n FROM user_sys_privs WHERE privilege <> 'CREATE SESSION';
  IF n <> 0 THEN RAISE_APPLICATION_ERROR(-20032,'Unexpected runtime system privilege'); END IF;
  SELECT COUNT(*) INTO n FROM user_role_privs;
  IF n <> 0 THEN RAISE_APPLICATION_ERROR(-20033,'Unexpected runtime role'); END IF;
  DBMS_OUTPUT.PUT_LINE('PASS runtime least privilege');
  INSERT INTO face_app.face_resumes(id,source_kind,profile_json) VALUES('smoke-resume','paste','{}');
  INSERT INTO face_app.face_sessions(id,resume_id,job_profile_json,paper_json,versions_json)
    VALUES('smoke-session','smoke-resume','{}','{}','{}');
  INSERT INTO face_app.face_turns(id,session_id,turn_index,question_json)
    VALUES('smoke-turn','smoke-session',0,'{}');
  INSERT INTO face_app.face_reports(id,session_id,revision,score_kind,range_low,range_high,coverage,
    payload_json,scoring_version,prompt_version,bank_version)
    VALUES('smoke-report','smoke-session',1,'interval',60,76,0.4,'{}','test','test','test-seed');
  DBMS_OUTPUT.PUT_LINE('PASS valid relational and interval insert');
  rejects(q'[INSERT INTO face_app.face_turns(session_id,turn_index,question_json)
    VALUES('missing-session',0,'{}')]',-2291,'turn session foreign key');
  rejects(q'[INSERT INTO face_app.face_turns(session_id,turn_index,question_json)
    VALUES('smoke-session',0,'{}')]',-1,'unique turn index');
  rejects(q'[INSERT INTO face_app.face_resumes(source_kind,profile_json)
    VALUES('paste','{broken')]',-2290,'invalid JSON rejected');
  rejects(q'[INSERT INTO face_app.face_resumes(source_kind,profile_json)
    VALUES('paste','{"x":1,"x":2}')]',-2290,'duplicate JSON keys rejected');
  rejects(q'[INSERT INTO face_app.face_rule_events(turn_id,event_key,event_kind,rule_id,
    scoring_version,dimension,points,status,evidence) VALUES('smoke-turn','negative',
    'DEDUCTION','TEST','test','CONTENT',-3,'APPLIED','synthetic')]',-2290,'positive points');
  rejects(q'[INSERT INTO face_app.face_rule_events(turn_id,event_key,event_kind,rule_id,
    scoring_version,dimension,points,status,evidence) VALUES('smoke-turn','no-evidence',
    'DEDUCTION','TEST','test','CONTENT',3,'APPLIED','   ')]',-2290,'applied evidence required');
  rejects(q'[INSERT INTO face_app.face_rule_events(turn_id,event_key,event_kind,rule_id,
    scoring_version,dimension,points,status,evidence,confidence,confidence_source)
    VALUES('smoke-turn','derived','DEDUCTION','TEST','test','CONTENT',3,'APPLIED',
    'synthetic',0.9,'derived')]',-2290,'derived confidence forbidden');
  rejects(q'[INSERT INTO face_app.face_reports(session_id,revision,score_kind,total_score,
    coverage,payload_json,scoring_version,prompt_version,bank_version)
    VALUES('smoke-session',2,'point',150,1,'{}','test','test','test')]',-2290,'score bounds');
  rejects(q'[INSERT INTO face_app.face_reports(session_id,revision,score_kind,total_score,
    range_low,range_high,coverage,payload_json,scoring_version,prompt_version,bank_version)
    VALUES('smoke-session',2,'interval',68,60,76,0.4,'{}','test','test','test')]',-2290,'interval hides point');
  rejects(q'[UPDATE face_app.face_reports SET coverage=coverage WHERE id='smoke-report']',
    -1031,'report snapshots cannot be updated');
  rejects(q'[DELETE FROM face_app.face_audit_logs WHERE id='nonexistent']',
    -1031,'runtime cannot erase audit');
  ROLLBACK;
  DBMS_OUTPUT.PUT_LINE('PASS rolled back all synthetic test rows');
EXCEPTION WHEN OTHERS THEN ROLLBACK; RAISE;
END;
/
exit success
