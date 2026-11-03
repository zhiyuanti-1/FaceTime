-- CR-1.0-014: EMPTY DATABASE ONLY. SQL*Plus as SYSDBA; never rerun on existing schema.
set echo off verify off
whenever oserror exit failure rollback
whenever sqlerror exit sql.sqlcode rollback
ALTER SESSION SET CONTAINER=FREEPDB1;
DECLARE n NUMBER;
BEGIN
 SELECT COUNT(*) INTO n FROM dba_users WHERE username IN ('FACE_APP','FACE_RUNTIME');
 IF n<>0 THEN RAISE_APPLICATION_ERROR(-20050,'Existing accounts: STOP and inspect migrations; do not recreate'); END IF;
END;
/
-- Use a distinct 16+ character alphanumeric password; copy it to local DB_PASSWORD.
accept runtime_password CHAR PROMPT 'New FACE_RUNTIME password (16+ letters/digits): ' HIDE
CREATE USER FACE_APP NO AUTHENTICATION DEFAULT TABLESPACE USERS QUOTA UNLIMITED ON USERS;
CREATE USER FACE_RUNTIME IDENTIFIED BY "&runtime_password";
undefine runtime_password
GRANT CREATE SESSION TO FACE_RUNTIME;
ALTER SESSION SET CURRENT_SCHEMA=FACE_APP;
@@001-initial-oracle.sql
@@002-runtime-grants.sql
@@005-core-workflow.sql
@@006-ia-workspace.sql
INSERT INTO face_migrations(version,checksum_sha256) VALUES('001-initial-oracle','13e4f04078f36df83658e76385948e9a84c2af147368ec54be3a62c5bce1b05b');
INSERT INTO face_migrations(version,checksum_sha256) VALUES('005-core-workflow','c0c8774cb87426b51b8039eb306b487fc4fb0290831aecd9e11dd0cda9789d19');
INSERT INTO face_migrations(version,checksum_sha256) VALUES('006-ia-workspace','3cd4f041f139b8704ccbeff3394ea8eee0967806a5cd3f36bf642d46bd8168b2');
COMMIT;
@@003-verify-oracle.sql
exit success
