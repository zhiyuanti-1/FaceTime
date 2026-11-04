-- CR-1.0-017. Add nullable structured content to existing owner-scoped resumes.
set define off
whenever sqlerror exit sql.sqlcode rollback
DECLARE n NUMBER;
BEGIN
 IF SYS_CONTEXT('USERENV','CON_NAME') <> 'FREEPDB1' OR SYS_CONTEXT('USERENV','CURRENT_SCHEMA') <> 'FACE_APP' THEN RAISE_APPLICATION_ERROR(-20041,'Wrong target'); END IF;
 SELECT COUNT(*) INTO n FROM all_tab_columns WHERE owner='FACE_APP' AND table_name='FACE_RESUMES' AND column_name='STRUCTURED_JSON';
 IF n<>0 THEN RAISE_APPLICATION_ERROR(-20044,'007 already started; inspect ledger'); END IF;
END;
/
ALTER TABLE face_resumes ADD (
 structured_json CLOB,
 CONSTRAINT ck_resume_structured CHECK(structured_json IS JSON STRICT)
);
