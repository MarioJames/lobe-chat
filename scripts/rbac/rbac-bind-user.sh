#!/bin/bash

# RBAC 用户角色绑定脚本
# 用于为用户分配角色

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 导入工具函数
source "$SCRIPT_DIR/rbac-utils.sh"

# 全局变量
USER_ID=""
ROLE_NAME=""
EXPIRES_AT=""

# 输入用户ID
input_user_id() {
    echo
    log_user "请输入用户ID:"
    echo "提示: 用户ID通常格式为 user_xxxxxxxxx"
    echo -n "用户ID: "
    read -r USER_ID

    if [ -z "$USER_ID" ]; then
        log_error "用户ID不能为空"
        return 1
    fi

    # 验证用户是否存在
    log_info "验证用户是否存在..."
    if check_user_exists "$USER_ID"; then
        # 获取用户信息
        local user_info=$(psql "$DATABASE_URL" -t -c "SELECT email, fullname FROM users WHERE id = '$USER_ID';" 2>/dev/null | sed 's/|/ | /g' | xargs)
        log_success "用户存在: $user_info"
        return 0
    else
        log_error "用户不存在: $USER_ID"
        echo "请确认用户ID是否正确，或检查用户是否已注册"
        return 1
    fi
}

# 显示可用角色列表
show_available_roles() {
    echo
    log_role "可用角色列表:"
    echo "============================================"

    local roles_info=$(psql "$DATABASE_URL" -c "
        SELECT
            r.name,
            r.display_name,
            r.description,
            r.is_system,
            COUNT(rp.permission_id) as permission_count
        FROM rbac_roles r
        LEFT JOIN rbac_role_permissions rp ON r.id = rp.role_id
        WHERE r.is_active = true
        GROUP BY r.id, r.name, r.display_name, r.description, r.is_system
        ORDER BY r.is_system DESC, r.name;
    " 2>/dev/null)

    echo "$roles_info"
    echo "============================================"
}

# 输入角色名称
input_role_name() {
    show_available_roles

    echo
    log_role "请输入角色名称:"
    echo "提示: 输入上述列表中的角色名称（name 列）"
    echo -n "角色名称: "
    read -r ROLE_NAME

    if [ -z "$ROLE_NAME" ]; then
        log_error "角色名称不能为空"
        return 1
    fi

    # 验证角色是否存在
    log_info "验证角色是否存在..."
    if check_role_exists "$ROLE_NAME"; then
        # 获取角色信息
        local role_info=$(psql "$DATABASE_URL" -t -c "SELECT display_name, description FROM rbac_roles WHERE name = '$ROLE_NAME';" 2>/dev/null | sed 's/|/ | /g' | xargs)
        log_success "角色存在: $role_info"
        return 0
    else
        log_error "角色不存在: $ROLE_NAME"
        echo "请确认角色名称是否正确"
        return 1
    fi
}

# 输入过期时间（可选）
input_expires_at() {
    echo
    log_info "设置角色过期时间（可选）:"
    echo "格式: YYYY-MM-DD HH:MM:SS 或 YYYY-MM-DD"
    echo "留空表示永不过期"
    echo -n "过期时间: "
    read -r EXPIRES_AT

    if [ -n "$EXPIRES_AT" ]; then
        # 验证日期格式
        if date -d "$EXPIRES_AT" >/dev/null 2>&1; then
            # 转换为标准格式
            EXPIRES_AT=$(date -d "$EXPIRES_AT" '+%Y-%m-%d %H:%M:%S')
            log_info "过期时间设置为: $EXPIRES_AT"
        else
            log_error "日期格式错误"
            return 1
        fi
    else
        log_info "角色永不过期"
    fi

    return 0
}

# 检查绑定状态
check_existing_binding() {
    local role_id=$(get_role_id "$ROLE_NAME")

    if [ -z "$role_id" ]; then
        log_error "无法获取角色ID"
        return 1
    fi

    log_info "检查现有绑定..."

    if check_user_role_binding "$USER_ID" "$role_id"; then
        # 获取现有绑定信息
        local binding_info=$(psql "$DATABASE_URL" -t -c "
            SELECT
                created_at,
                expires_at
            FROM rbac_user_roles
            WHERE user_id = '$USER_ID' AND role_id = '$role_id';
        " 2>/dev/null)

        log_warning "用户已绑定该角色"
        echo "绑定信息: $binding_info"

        if confirm "是否要更新现有绑定？" "n"; then
            return 0  # 继续更新
        else
            return 1  # 取消操作
        fi
    fi

    return 0
}

# 执行角色绑定
execute_binding() {
    local role_id=$(get_role_id "$ROLE_NAME")

    if [ -z "$role_id" ]; then
        log_error "无法获取角色ID"
        return 1
    fi

    log_info "执行角色绑定..."

    # 构建SQL语句
    local sql
    if [ -n "$EXPIRES_AT" ]; then
        sql="INSERT INTO rbac_user_roles (user_id, role_id, expires_at)
             VALUES ('$USER_ID', '$role_id', '$EXPIRES_AT')
             ON CONFLICT (user_id, role_id)
             DO UPDATE SET expires_at = EXCLUDED.expires_at, created_at = now();"
    else
        sql="INSERT INTO rbac_user_roles (user_id, role_id)
             VALUES ('$USER_ID', '$role_id')
             ON CONFLICT (user_id, role_id)
             DO UPDATE SET expires_at = NULL, created_at = now();"
    fi

    if execute_sql "$sql" "绑定用户角色"; then
        log_success "角色绑定成功！"
        return 0
    else
        log_error "角色绑定失败"
        return 1
    fi
}

# 显示绑定结果
show_binding_result() {
    echo
    log_success "==================== 绑定完成 ===================="
    echo

    # 获取用户信息
    local user_info=$(psql "$DATABASE_URL" -t -c "SELECT email, fullname FROM users WHERE id = '$USER_ID';" 2>/dev/null)
    local role_info=$(psql "$DATABASE_URL" -t -c "SELECT display_name, description FROM rbac_roles WHERE name = '$ROLE_NAME';" 2>/dev/null)

    echo "👤 用户信息:"
    echo "   ID: $USER_ID"
    echo "   详情: $user_info"
    echo

    echo "🎭 角色信息:"
    echo "   名称: $ROLE_NAME"
    echo "   详情: $role_info"
    echo

    if [ -n "$EXPIRES_AT" ]; then
        echo "⏰ 过期时间: $EXPIRES_AT"
    else
        echo "⏰ 过期时间: 永不过期"
    fi
    echo

    # 显示用户当前所有角色
    echo "👥 用户当前角色:"
    local current_roles=$(psql "$DATABASE_URL" -c "
        SELECT
            r.name,
            r.display_name,
            ur.created_at,
            ur.expires_at
        FROM rbac_user_roles ur
        JOIN rbac_roles r ON r.id = ur.role_id
        WHERE ur.user_id = '$USER_ID'
        ORDER BY ur.created_at DESC;
    " 2>/dev/null)

    echo "$current_roles"
    echo

    log_info "角色绑定操作完成！"
}

# 显示用户当前角色（查询模式）
show_user_roles() {
    local query_user_id="$1"

    if [ -z "$query_user_id" ]; then
        echo -n "请输入要查询的用户ID: "
        read -r query_user_id
    fi

    if [ -z "$query_user_id" ]; then
        log_error "用户ID不能为空"
        return 1
    fi

    if ! check_user_exists "$query_user_id"; then
        log_error "用户不存在: $query_user_id"
        return 1
    fi

    echo
    log_user "用户角色信息:"
    echo "============================================"

    local user_roles=$(psql "$DATABASE_URL" -c "
        SELECT
            r.name as \"角色名称\",
            r.display_name as \"显示名称\",
            r.description as \"描述\",
            ur.created_at as \"绑定时间\",
            ur.expires_at as \"过期时间\",
            CASE
                WHEN ur.expires_at IS NULL THEN '永不过期'
                WHEN ur.expires_at > now() THEN '有效'
                ELSE '已过期'
            END as \"状态\"
        FROM rbac_user_roles ur
        JOIN rbac_roles r ON r.id = ur.role_id
        WHERE ur.user_id = '$query_user_id'
        ORDER BY ur.created_at DESC;
    " 2>/dev/null)

    echo "$user_roles"
    echo "============================================"
}

# 主菜单
show_main_menu() {
    echo
    echo "请选择操作:"
    echo "1. 为用户分配角色"
    echo "2. 查询用户角色"
    echo "3. 显示所有角色"
    echo "4. 退出"
    echo
    echo -n "请输入选项 (1-4): "
}

# 批量绑定模式
batch_mode() {
    local user_id="$1"
    local role_name="$2"
    local expires_at="$3"

    log_info "批量绑定模式"

    USER_ID="$user_id"
    ROLE_NAME="$role_name"
    EXPIRES_AT="$expires_at"

    # 验证参数
    if [ -z "$USER_ID" ] || [ -z "$ROLE_NAME" ]; then
        log_error "批量模式需要提供用户ID和角色名称"
        echo "用法: $0 --batch <用户ID> <角色名称> [过期时间]"
        return 1
    fi

    # 验证用户和角色
    if ! check_user_exists "$USER_ID"; then
        log_error "用户不存在: $USER_ID"
        return 1
    fi

    if ! check_role_exists "$ROLE_NAME"; then
        log_error "角色不存在: $ROLE_NAME"
        return 1
    fi

    # 验证过期时间格式
    if [ -n "$EXPIRES_AT" ]; then
        if ! date -d "$EXPIRES_AT" >/dev/null 2>&1; then
            log_error "日期格式错误: $EXPIRES_AT"
            return 1
        fi
        EXPIRES_AT=$(date -d "$EXPIRES_AT" '+%Y-%m-%d %H:%M:%S')
    fi

    # 执行绑定
    log_info "用户: $USER_ID"
    log_info "角色: $ROLE_NAME"
    if [ -n "$EXPIRES_AT" ]; then
        log_info "过期: $EXPIRES_AT"
    fi

    if execute_binding; then
        show_binding_result
        return 0
    else
        return 1
    fi
}

# 主函数
main() {
    # 解析命令行参数
    case "${1:-}" in
        "--batch")
            shift
            batch_mode "$@"
            return $?
            ;;
        "--query")
            shift
            show_title "查询用户角色"
            check_database_connection || exit 1
            show_user_roles "$1"
            return 0
            ;;
        "--help"|"-h")
            echo "RBAC 用户角色绑定脚本"
            echo
            echo "用法:"
            echo "  $0                                    # 交互模式"
            echo "  $0 --batch <用户ID> <角色名> [过期时间]  # 批量模式"
            echo "  $0 --query [用户ID]                   # 查询模式"
            echo "  $0 --help                            # 显示帮助"
            echo
            echo "示例:"
            echo "  $0 --batch user_123456 super_admin"
            echo "  $0 --batch user_123456 editor '2024-12-31'"
            echo "  $0 --query user_123456"
            return 0
            ;;
    esac

    show_title "RBAC 用户角色绑定"

    # 检查数据库连接
    if ! check_database_connection; then
        exit 1
    fi

    # 主循环
    while true; do
        show_main_menu
        read -r choice

        case $choice in
            1)
                echo
                log_info "开始角色绑定流程..."

                # 输入用户ID
                if ! input_user_id; then
                    wait_for_key
                    continue
                fi

                # 输入角色名称
                if ! input_role_name; then
                    wait_for_key
                    continue
                fi

                # 输入过期时间
                if ! input_expires_at; then
                    wait_for_key
                    continue
                fi

                # 检查现有绑定
                if ! check_existing_binding; then
                    log_info "操作已取消"
                    wait_for_key
                    continue
                fi

                # 确认操作
                echo
                echo "即将执行绑定操作:"
                echo "用户: $USER_ID"
                echo "角色: $ROLE_NAME"
                if [ -n "$EXPIRES_AT" ]; then
                    echo "过期时间: $EXPIRES_AT"
                else
                    echo "过期时间: 永不过期"
                fi

                if confirm "确认执行绑定？" "y"; then
                    if execute_binding; then
                        show_binding_result
                    fi
                fi

                wait_for_key
                ;;
            2)
                show_user_roles
                wait_for_key
                ;;
            3)
                show_available_roles
                wait_for_key
                ;;
            4)
                log_info "退出程序"
                break
                ;;
            *)
                log_error "无效选项，请输入 1-4"
                ;;
        esac
    done
}

# 执行主函数
main "$@"
