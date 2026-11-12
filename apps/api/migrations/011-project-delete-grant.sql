-- CR-1.0-051：授予项目删除接口所需的表级权限。
-- 迁移成功后由执行方登记文件校验和。
GRANT DELETE ON FACE_APP.FACE_PROJECT TO FACE_RUNTIME;
