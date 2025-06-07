#!/bin/bash

# RBAC 初始化脚本
# 用于初始化权限系统，创建 super_admin 角色并分配所有权限

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 导入工具函数
source "$SCRIPT_DIR/rbac-utils.sh"

# 权限定义（从 src/const/rbac.ts 提取）
BASIC_PERMISSIONS=(
  "agent:create:all"
  "agent:create:workspace"
  "agent:create:owner"
  "agent:delete:all"
  "agent:delete:workspace"
  "agent:delete:owner"
  "agent:fork:all"
  "agent:fork:workspace"
  "agent:fork:owner"
  "agent:publish:all"
  "agent:publish:workspace"
  "agent:publish:owner"
  "agent:read:all"
  "agent:read:workspace"
  "agent:read:owner"
  "agent:share:all"
  "agent:share:workspace"
  "agent:share:owner"
  "agent:update:all"
  "agent:update:workspace"
  "agent:update:owner"
  "ai_model:configure:all"
  "ai_model:configure:workspace"
  "ai_model:configure:owner"
  "ai_model:use:all"
  "ai_model:use:workspace"
  "ai_model:use:owner"
  "ai_provider:create:all"
  "ai_provider:create:workspace"
  "ai_provider:create:owner"
  "ai_provider:delete:all"
  "ai_provider:delete:workspace"
  "ai_provider:delete:owner"
  "ai_provider:read:all"
  "ai_provider:read:workspace"
  "ai_provider:read:owner"
  "ai_provider:update:all"
  "ai_provider:update:workspace"
  "ai_provider:update:owner"
  "api_key:create:all"
  "api_key:create:workspace"
  "api_key:create:owner"
  "api_key:delete:all"
  "api_key:delete:workspace"
  "api_key:delete:owner"
  "api_key:read:all"
  "api_key:read:workspace"
  "api_key:read:owner"
  "api_key:update:all"
  "async_task:cancel:all"
  "async_task:cancel:workspace"
  "async_task:cancel:owner"
  "async_task:create:all"
  "async_task:create:workspace"
  "async_task:create:owner"
  "async_task:read:all"
  "async_task:read:workspace"
  "async_task:read:owner"
  "audit:log_export:all"
  "audit:log_export:workspace"
  "audit:log_export:owner"
  "audit:log_read:all"
  "audit:log_read:workspace"
  "audit:log_read:owner"
  "auth:oauth_configure:all"
  "auth:oauth_configure:workspace"
  "auth:oauth_configure:owner"
  "auth:oidc_configure:all"
  "auth:oidc_configure:workspace"
  "auth:oidc_configure:owner"
  "auth:session_manage:all"
  "auth:session_manage:workspace"
  "auth:session_manage:owner"
  "data:backup:all"
  "data:backup:workspace"
  "data:backup:owner"
  "data:export:all"
  "data:export:workspace"
  "data:export:owner"
  "data:import:all"
  "data:import:workspace"
  "data:import:owner"
  "data:restore:all"
  "data:restore:workspace"
  "data:restore:owner"
  "document:chunk:all"
  "document:chunk:workspace"
  "document:chunk:owner"
  "document:create:all"
  "document:create:workspace"
  "document:create:owner"
  "document:delete:all"
  "document:delete:workspace"
  "document:delete:owner"
  "document:read:all"
  "document:read:workspace"
  "document:read:owner"
  "document:update:all"
  "document:update:workspace"
  "document:update:owner"
  "file:download:all"
  "file:download:workspace"
  "file:download:owner"
  "file:upload:all"
  "file:upload:workspace"
  "file:upload:owner"
  "knowledge_base:create:all"
  "knowledge_base:create:workspace"
  "knowledge_base:create:owner"
  "knowledge_base:delete:all"
  "knowledge_base:delete:workspace"
  "knowledge_base:delete:owner"
  "knowledge_base:read:all"
  "knowledge_base:read:workspace"
  "knowledge_base:read:owner"
  "knowledge_base:share:all"
  "knowledge_base:share:workspace"
  "knowledge_base:share:owner"
  "knowledge_base:update:all"
  "knowledge_base:update:workspace"
  "knowledge_base:update:owner"
  "message:create:all"
  "message:create:workspace"
  "message:create:owner"
  "message:delete:all"
  "message:delete:workspace"
  "message:delete:owner"
  "message:favorite:all"
  "message:favorite:workspace"
  "message:favorite:owner"
  "message:read:all"
  "message:read:workspace"
  "message:read:owner"
  "message:regenerate:all"
  "message:regenerate:workspace"
  "message:regenerate:owner"
  "message:update:all"
  "message:update:workspace"
  "message:update:owner"
  "plugin:configure:all"
  "plugin:configure:workspace"
  "plugin:configure:owner"
  "plugin:develop:all"
  "plugin:develop:workspace"
  "plugin:develop:owner"
  "plugin:install:all"
  "plugin:install:workspace"
  "plugin:install:owner"
  "plugin:uninstall:all"
  "plugin:uninstall:workspace"
  "plugin:uninstall:owner"
  "rag:embed:all"
  "rag:embed:workspace"
  "rag:embed:owner"
  "rag:eval:all"
  "rag:eval:workspace"
  "rag:eval:owner"
  "rag:search:all"
  "rag:search:workspace"
  "rag:search:owner"
  "rbac:permission_create:all"
  "rbac:permission_create:workspace"
  "rbac:permission_create:owner"
  "rbac:permission_delete:all"
  "rbac:permission_delete:workspace"
  "rbac:permission_delete:owner"
  "rbac:permission_read:all"
  "session_group:create:all"
  "session_group:create:workspace"
  "session_group:create:owner"
  "session_group:delete:all"
  "session_group:delete:workspace"
  "session_group:delete:owner"
  "session_group:read:all"
  "session_group:read:workspace"
  "session_group:read:owner"
  "session_group:update:all"
  "session_group:update:workspace"
  "session_group:update:owner"
  "session:import:all"
  "session:import:workspace"
  "session:import:owner"
  "session:read:all"
  "session:read:workspace"
  "session:read:owner"
  "session:share:all"
  "session:share:workspace"
  "session:share:owner"
  "session:update:all"
  "session:update:workspace"
  "session:update:owner"
  "system:backup:all"
  "system:backup:workspace"
  "system:backup:owner"
  "system:configure:all"
  "system:configure:workspace"
  "system:configure:owner"
  "system:log_view:all"
  "system:log_view:workspace"
  "system:log_view:owner"
  "system:maintenance:all"
  "system:maintenance:workspace"
  "system:maintenance:owner"
  "system:monitor:all"
  "system:restore:all"
  "system:restore:workspace"
  "system:restore:owner"
  "topic:create:all"
  "topic:create:workspace"
  "topic:create:owner"
  "topic:delete:all"
  "topic:delete:workspace"
  "topic:delete:owner"
  "topic:favorite:all"
  "topic:favorite:workspace"
  "topic:favorite:owner"
  "topic:read:all"
  "topic:read:workspace"
  "topic:read:owner"
  "topic:update:all"
  "topic:update:workspace"
  "topic:update:owner"
  "user:create:all"
  "user:create:workspace"
  "user:create:owner"
  "user:delete:all"
  "user:delete:workspace"
  "user:delete:owner"
  "user:profile_update:all"
  "user:profile_update:workspace"
  "user:profile_update:owner"
  "user:read:all"
  "user:read:workspace"
  "user:read:owner"
  "user:update:all"
  "user:update:workspace"
  "user:update:owner"
)

# 检查 RBAC 表是否存在
check_rbac_tables() {
  log_info "检查 RBAC 表结构..."

  local tables=("rbac_permissions" "rbac_roles" "rbac_role_permissions" "rbac_user_roles")
  local missing_tables=()

  for table in "${tables[@]}"; do
    if ! check_table_exists "$table"; then
      missing_tables+=("$table")
    fi
  done

  if [ ${#missing_tables[@]} -gt 0 ]; then
    log_error "以下 RBAC 表不存在: ${missing_tables[*]}"
    echo "请先运行数据库迁移脚本创建 RBAC 表"
    echo "例如: pnpm db:migrate"
    return 1
  fi

  log_success "RBAC 表结构检查完成"
  return 0
}

# 初始化权限数据
init_permissions() {
  log_permission "开始初始化权限数据..."

  local inserted=0
  local skipped=0

  for permission_code in "${BASIC_PERMISSIONS[@]}"; do
    # 检查权限是否已存在
    local exists=$(query_sql "SELECT COUNT(*) FROM rbac_permissions WHERE code = '$permission_code';")

    if [ "$exists" -gt 0 ]; then
      skipped=$((skipped + 1))
      continue
    fi

    # 生成权限信息
    local name=$(generate_permission_display_name "$permission_code")
    local description="${name}的权限"
    local category=$(get_permission_category "$permission_code")

    # 插入权限
    local sql="INSERT INTO rbac_permissions (code, name, description, category, is_active) VALUES ('$permission_code', '$name', '$description', '$category', true);"

    if execute_sql "$sql"; then
      inserted=$((inserted + 1))
      log_permission "✓ 已添加权限: $permission_code ($name)"
    else
      log_error "✗ 添加权限失败: $permission_code"
      return 1
    fi
  done

  log_success "权限初始化完成 - 新增: $inserted 个，跳过: $skipped 个"
  return 0
}

# 创建超级管理员角色
create_super_admin_role() {
  log_role "创建超级管理员角色..."

  local role_name="super_admin"
  local display_name="超级管理员"
  local description="拥有系统所有权限的超级管理员角色"

  # 检查角色是否已存在
  if check_role_exists "$role_name"; then
    log_warning "角色 $role_name 已存在，跳过创建"
    return 0
  fi

  # 创建角色
  local sql="INSERT INTO rbac_roles (name, display_name, description, is_system, is_active) VALUES ('$role_name', '$display_name', '$description', true, true);"

  if execute_sql "$sql" "创建超级管理员角色"; then
    log_success "超级管理员角色创建成功"
    return 0
  else
    log_error "超级管理员角色创建失败"
    return 1
  fi
}

# 为超级管理员角色分配所有权限
assign_all_permissions_to_super_admin() {
  log_permission "为超级管理员角色分配权限..."

  local role_name="super_admin"
  local role_id=$(get_role_id "$role_name")

  if [ -z "$role_id" ]; then
    log_error "无法获取超级管理员角色 ID"
    return 1
  fi

  log_info "角色 ID: $role_id"

  local assigned=0
  local skipped=0

  for permission_code in "${BASIC_PERMISSIONS[@]}"; do
    # 获取权限 ID
    local permission_id=$(query_sql "SELECT id FROM rbac_permissions WHERE code = '$permission_code';")

    if [ -z "$permission_id" ]; then
      log_warning "权限 $permission_code 不存在，跳过"
      continue
    fi

    # 检查是否已分配
    local exists=$(query_sql "SELECT COUNT(*) FROM rbac_role_permissions WHERE role_id = '$role_id' AND permission_id = '$permission_id';")

    if [ "$exists" -gt 0 ]; then
      skipped=$((skipped + 1))
      continue
    fi

    # 分配权限
    local sql="INSERT INTO rbac_role_permissions (role_id, permission_id) VALUES ('$role_id', '$permission_id');"

    if execute_sql "$sql"; then
      assigned=$((assigned + 1))
      local permission_name=$(generate_permission_display_name "$permission_code")
      log_permission "✓ 已分配权限: $permission_code ($permission_name)"
    else
      log_error "✗ 分配权限失败: $permission_code"
      return 1
    fi
  done

  log_success "权限分配完成 - 新增: $assigned 个，跳过: $skipped 个"
  return 0
}

# 显示初始化结果
show_init_summary() {
  echo
  log_success "==================== 初始化完成 ===================="
  echo

  # 统计信息
  local total_permissions=$(query_sql "SELECT COUNT(*) FROM rbac_permissions;")
  local total_roles=$(query_sql "SELECT COUNT(*) FROM rbac_roles;")
  local super_admin_permissions=$(query_sql "
        SELECT COUNT(*) FROM rbac_role_permissions rp
        JOIN rbac_roles r ON r.id = rp.role_id
        WHERE r.name = 'super_admin';
    ")

  echo "📊 统计信息:"
  echo "   • 总权限数: $total_permissions"
  echo "   • 总角色数: $total_roles"
  echo "   • 超级管理员权限数: $super_admin_permissions"
  echo

  echo "🎯 后续步骤:"
  echo "   1. 使用 rbac-bind-user.sh 为用户分配角色"
  echo "   2. 根据需要创建其他角色和权限策略"
  echo

  log_info "RBAC 初始化完成！"
}

# 主函数
main() {
  show_title "RBAC 系统初始化"

  # 检查数据库连接
  if ! check_database_connection; then
    exit 1
  fi

  # 检查 RBAC 表
  if ! check_rbac_tables; then
    exit 1
  fi

  echo "即将执行以下操作:"
  echo "1. 初始化 ${#BASIC_PERMISSIONS[@]} 个系统权限"
  echo "2. 创建超级管理员角色 (super_admin)"
  echo "3. 为超级管理员分配所有权限"
  echo

  if ! confirm "是否继续执行初始化操作？" "y"; then
    log_info "操作已取消"
    exit 0
  fi

  # 执行初始化步骤
  echo
  log_info "开始执行初始化..."

  if ! init_permissions; then
    log_error "权限初始化失败"
    exit 1
  fi

  if ! create_super_admin_role; then
    log_error "角色创建失败"
    exit 1
  fi

  if ! assign_all_permissions_to_super_admin; then
    log_error "权限分配失败"
    exit 1
  fi

  # 显示结果
  show_init_summary
}

# 执行主函数
main "$@"
