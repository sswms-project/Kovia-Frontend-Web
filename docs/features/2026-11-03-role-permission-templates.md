# Mẫu quyền đề xuất trên trang Phân quyền

Chính sách, ma trận và hợp đồng: [spec BE](../../../SSWMS-Backend/docs/features/2026-11-03-role-permission-templates.md).

- Backend là nguồn danh sách `roles[].recommendedPermissionIds`; FE không tự hard-code permission keys.
- Theo vai trò → chọn Manager/Staff → Dùng mẫu đề xuất → Chọn mẫu, chưa lưu → kiểm tra/chỉnh quyền → Lưu thay đổi.
- Nút Bỏ thay đổi phục hồi bản nháp; đổi tab/role/rời trang vẫn có cảnh báo chưa lưu.
- Không có nút mẫu ở chế độ chỉ xem; khóa trong lúc lưu. BE cũ thiếu/null danh sách mẫu thì ẩn nút.
- Personal overrides được giữ nguyên; Tenant Owner không bị thay quyền. Chọn mẫu không gọi API ghi.
- Tái dùng AlertDialog/Button/Tooltip và luồng mutation/cache/audit hiện có, không thêm dependencies.
- Kiểm thử: 5 component/workflow tests, scoped ESLint, production TypeScript đạt. Chưa test UI trên thiết bị thật. Không tạo dữ liệu QA.
