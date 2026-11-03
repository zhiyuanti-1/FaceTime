-- Read-only verification. Run inside FREEPDB1 after initial DDL.
set pagesize 100 linesize 180
whenever sqlerror exit sql.sqlcode rollback
SELECT owner, table_name FROM all_tables WHERE owner='FACE_APP' ORDER BY table_name;
SELECT table_name, constraint_name, constraint_type, status, validated
  FROM all_constraints WHERE owner='FACE_APP' ORDER BY table_name, constraint_type;
SELECT table_name, index_name, status FROM all_indexes
  WHERE owner='FACE_APP' ORDER BY table_name,index_name;
SELECT grantee,table_name,privilege FROM dba_tab_privs
  WHERE owner='FACE_APP' AND grantee='FACE_RUNTIME' ORDER BY table_name,privilege;
