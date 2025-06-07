#!/bin/bash

# RBAC Shell 脚本工具函数
# 提供数据库连接、权限解析等通用功能

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# 图标定义
ICON_SUCCESS="✅"
ICON_ERROR="❌"
ICON_WARNING="⚠️"
ICON_INFO="ℹ️"
ICON_ROCKET="🚀"
ICON_DATABASE="🗄️"
ICON_USER="👤"
ICON_ROLE="🎭"
ICON_PERMISSION="🔐"

# 日志函数
log_info() {
    echo -e "${BLUE}${ICON_INFO}${NC} $1"
}

log_success() {
    echo -e "${GREEN}${ICON_SUCCESS}${NC} $1"
}

log_error() {
    echo -e "${RED}${ICON_ERROR}${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}${ICON_WARNING}${NC} $1"
}

log_database() {
    echo -e "${CYAN}${ICON_DATABASE}${NC} $1"
}

log_user() {
    echo -e "${PURPLE}${ICON_USER}${NC} $1"
}

log_role() {
    echo -e "${PURPLE}${ICON_ROLE}${NC} $1"
}

log_permission() {
    echo -e "${YELLOW}${ICON_PERMISSION}${NC} $1"
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."

    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL 环境变量未设置"
        echo "请设置 DATABASE_URL 环境变量，例如："
        echo "export DATABASE_URL='postgresql://username:password@hostname:port/database'"
        return 1
    fi

    # 测试数据库连接
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "数据库连接正常"
        return 0
    else
        log_error "数据库连接失败"
        echo "请检查 DATABASE_URL 是否正确，以及数据库是否可访问"
        return 1
    fi
}

# 执行 SQL 查询
execute_sql() {
    local sql="$1"
    local description="$2"

    if [ -n "$description" ]; then
        log_database "$description"
    fi

    if psql "$DATABASE_URL" -c "$sql" > /dev/null 2>&1; then
        return 0
    else
        log_error "SQL 执行失败: $sql"
        return 1
    fi
}

# 执行 SQL 查询并返回结果
query_sql() {
    local sql="$1"
    psql "$DATABASE_URL" -t -c "$sql" 2>/dev/null | tr -d ' '
}

# 检查表是否存在
check_table_exists() {
    local table_name="$1"
    local result=$(query_sql "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table_name');")
    if [ "$result" = "t" ]; then
        return 0
    else
        return 1
    fi
}

# 检查用户是否存在
check_user_exists() {
    local user_id="$1"
    local result=$(query_sql "SELECT COUNT(*) FROM users WHERE id = '$user_id';")
    if [ "$result" -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

# 检查角色是否存在
check_role_exists() {
    local role_name="$1"
    local result=$(query_sql "SELECT COUNT(*) FROM rbac_roles WHERE name = '$role_name';")
    if [ "$result" -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

# 获取角色ID
get_role_id() {
    local role_name="$1"
    query_sql "SELECT id FROM rbac_roles WHERE name = '$role_name';"
}

# 检查用户角色绑定是否存在
check_user_role_binding() {
    local user_id="$1"
    local role_id="$2"
    local result=$(query_sql "SELECT COUNT(*) FROM rbac_user_roles WHERE user_id = '$user_id' AND role_id = '$role_id';")
    if [ "$result" -gt 0 ]; then
        return 0
    else
        return 1
    fi
}

# 权限名称映射函数
get_permission_name() {
    local code="$1"
    local operation=$(echo "$code" | cut -d':' -f2)
    local module=$(echo "$code" | cut -d':' -f1)

    # 操作映射
    case "$operation" in
        "assign") echo "分配" ;;
        "backup") echo "备份" ;;
        "cancel") echo "取消" ;;
        "chunk") echo "分块处理" ;;
        "configure") echo "配置" ;;
        "create") echo "创建" ;;
        "delete") echo "删除" ;;
        "develop") echo "开发" ;;
        "download") echo "下载" ;;
        "embed") echo "嵌入" ;;
        "eval") echo "评估" ;;
        "export") echo "导出" ;;
        "favorite") echo "收藏" ;;
        "fork") echo "Fork" ;;
        "import") echo "导入" ;;
        "install") echo "安装" ;;
        "log_export") echo "导出日志" ;;
        "log_read") echo "读取日志" ;;
        "log_view") echo "查看日志" ;;
        "maintenance") echo "维护" ;;
        "manage") echo "管理" ;;
        "monitor") echo "监控" ;;
        "oauth_configure") echo "OAuth配置" ;;
        "oidc_configure") echo "OIDC配置" ;;
        "permission_create") echo "创建权限" ;;
        "permission_delete") echo "删除权限" ;;
        "permission_read") echo "查看权限" ;;
        "permission_update") echo "更新权限" ;;
        "profile_update") echo "更新个人资料" ;;
        "publish") echo "发布" ;;
        "read") echo "查看" ;;
        "regenerate") echo "重新生成" ;;
        "restore") echo "恢复" ;;
        "revoke") echo "撤销" ;;
        "role_create") echo "创建角色" ;;
        "role_delete") echo "删除角色" ;;
        "role_permission_assign") echo "分配角色权限" ;;
        "role_permission_revoke") echo "撤销角色权限" ;;
        "role_read") echo "查看角色" ;;
        "role_update") echo "更新角色" ;;
        "search") echo "搜索" ;;
        "session_manage") echo "会话管理" ;;
        "share") echo "分享" ;;
        "system_init") echo "系统初始化" ;;
        "uninstall") echo "卸载" ;;
        "update") echo "更新" ;;
        "upload") echo "上传" ;;
        "use") echo "使用" ;;
        "user_permission_view") echo "查看用户权限" ;;
        "user_role_assign") echo "分配用户角色" ;;
        "user_role_revoke") echo "撤销用户角色" ;;
        *) echo "$operation" ;;
    esac
}

# 模块名称映射函数
get_module_name() {
    local module="$1"

    case "$module" in
        "agent") echo "智能体" ;;
        "ai_model") echo "AI模型" ;;
        "ai_provider") echo "AI提供商" ;;
        "api_key") echo "API密钥" ;;
        "async_task") echo "异步任务" ;;
        "audit") echo "审计" ;;
        "auth") echo "认证" ;;
        "data") echo "数据" ;;
        "document") echo "文档" ;;
        "file") echo "文件" ;;
        "knowledge_base") echo "知识库" ;;
        "message") echo "消息" ;;
        "plugin") echo "插件" ;;
        "rag") echo "RAG" ;;
        "rbac") echo "权限管理" ;;
        "session") echo "会话" ;;
        "session_group") echo "会话组" ;;
        "system") echo "系统" ;;
        "topic") echo "话题" ;;
        "user") echo "用户" ;;
        *) echo "$module" ;;
    esac
}

# 获取权限分类
get_permission_category() {
    local code="$1"
    local module=$(echo "$code" | cut -d':' -f1)

    case "$module" in
        "agent") echo "agent" ;;
        "ai_model"|"ai_provider") echo "ai_infrastructure" ;;
        "api_key") echo "api_key" ;;
        "async_task") echo "async_task" ;;
        "audit") echo "audit" ;;
        "auth") echo "authentication" ;;
        "data") echo "data_management" ;;
        "document") echo "document" ;;
        "file") echo "file" ;;
        "knowledge_base") echo "knowledge_base" ;;
        "message") echo "message" ;;
        "plugin") echo "plugin" ;;
        "rag") echo "rag" ;;
        "rbac") echo "rbac" ;;
        "session") echo "session" ;;
        "session_group") echo "session_group" ;;
        "system") echo "system" ;;
        "topic") echo "topic" ;;
        "user") echo "user" ;;
        *) echo "$module" ;;
    esac
}

# 生成权限的友好名称
generate_permission_display_name() {
    local code="$1"
    local operation=$(echo "$code" | cut -d':' -f2)
    local module=$(echo "$code" | cut -d':' -f1)

    local operation_name=$(get_permission_name "$code")
    local module_name=$(get_module_name "$module")

    echo "${operation_name}${module_name}"
}

# 确认提示函数
confirm() {
    local message="$1"
    local default="${2:-n}"

    if [ "$default" = "y" ]; then
        prompt="[Y/n]"
    else
        prompt="[y/N]"
    fi

    echo -n -e "${YELLOW}${ICON_WARNING}${NC} $message $prompt: "
    read -r response

    if [ -z "$response" ]; then
        response="$default"
    fi

    case "$response" in
        [yY]|[yY][eE][sS]) return 0 ;;
        *) return 1 ;;
    esac
}

# 等待用户按键继续
wait_for_key() {
    echo -e "\n${CYAN}按任意键继续...${NC}"
    read -n 1 -s
}

# 显示脚本标题
show_title() {
    local title="$1"
    echo -e "\n${WHITE}================================================${NC}"
    echo -e "${WHITE}${ICON_ROCKET} $title${NC}"
    echo -e "${WHITE}================================================${NC}\n"
}
