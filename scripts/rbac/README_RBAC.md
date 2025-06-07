# RBAC 权限管理脚本使用指南

本目录包含了 LobeChat RBAC 权限管理系统的初始化和管理脚本。

## 📋 脚本概览

### 🔧 工具脚本

- **`utils/rbac-utils.sh`** - 通用工具函数库，提供数据库连接、权限解析等功能

### 🚀 核心脚本

- **`rbac-init.sh`** - RBAC 系统初始化脚本
- **`rbac-bind-user.sh`** - 用户角色绑定脚本

## 🛠️ 环境准备

### 1. 环境变量设置

确保设置了正确的数据库连接环境变量：

```bash
export DATABASE_URL="postgresql://username:password@hostname:port/database"
```

### 2. 依赖检查

确保系统已安装：

- `psql` - PostgreSQL 客户端工具
- `bash` - Shell 解释器（4.0+）

### 3. 数据库准备

确保 RBAC 相关表已创建：

```bash
# 运行数据库迁移
pnpm db:migrate
```

## 📖 使用指南

### 🔥 初始化 RBAC 系统

首次部署时，需要初始化权限系统：

```bash
# 运行初始化脚本
./scripts/rbac-init.sh
```

**初始化内容：**

- 导入所有系统权限（基于 `src/const/rbac.ts`）
- 创建超级管理员角色 (`super_admin`)
- 为超级管理员分配所有权限

**执行结果：**

- ✅ 创建了 90+ 个系统权限
- ✅ 创建了超级管理员角色
- ✅ 建立了完整的权限关联关系

### 👤 用户角色管理

#### 交互式绑定

启动交互式界面为用户分配角色：

```bash
./scripts/rbac-bind-user.sh
```

**功能菜单：**

1. 为用户分配角色
2. 查询用户角色
3. 显示所有角色
4. 退出

#### 批量绑定

直接命令行绑定用户角色：

```bash
# 永久绑定
./scripts/rbac-bind-user.sh --batch user_123456 super_admin

# 临时绑定（带过期时间）
./scripts/rbac-bind-user.sh --batch user_123456 editor "2024-12-31"
./scripts/rbac-bind-user.sh --batch user_123456 viewer "2024-12-31 23:59:59"
```

#### 角色查询

查询用户当前角色：

```bash
# 交互式查询
./scripts/rbac-bind-user.sh --query

# 直接查询指定用户
./scripts/rbac-bind-user.sh --query user_123456
```

## 📊 权限系统说明

### 权限分类

权限按模块分为以下类别：

| 分类                  | 描述        | 示例权限                                    |
| --------------------- | ----------- | ------------------------------------------- |
| **agent**             | 智能体管理  | `agent:create`, `agent:update`              |
| **ai_infrastructure** | AI 基础设施 | `ai_model:use`, `ai_provider:configure`     |
| **file**              | 文件管理    | `file:upload`, `file:download`              |
| **message**           | 消息管理    | `message:create`, `message:read`            |
| **session**           | 会话管理    | `session:create`, `session:share`           |
| **user**              | 用户管理    | `user:create`, `user:update`                |
| **rbac**              | 权限管理    | `rbac:role_create`, `rbac:user_role_assign` |
| **system**            | 系统管理    | `system:configure`, `system:monitor`        |

### 角色说明

#### super_admin（超级管理员）

- **权限范围**：拥有所有系统权限
- **适用场景**：系统初始化、全面管理
- **安全提示**：谨慎分配，建议仅限关键管理员

#### 其他角色

根据业务需求，可创建更多角色，如：

- `admin` - 业务管理员
- `editor` - 内容编辑者
- `viewer` - 只读用户

## 🔐 安全最佳实践

### 1. 权限最小化原则

- 只分配用户必需的最小权限
- 定期审查用户权限分配
- 使用临时角色进行短期授权

### 2. 角色过期管理

```bash
# 为临时工作分配带过期时间的角色
./scripts/rbac-bind-user.sh --batch user_temp editor "2024-01-31"
```

### 3. 审计和监控

- 定期查询用户角色分配情况
- 监控权限使用日志
- 及时回收不需要的权限

## 🚨 故障排除

### 数据库连接问题

```bash
# 检查环境变量
echo $DATABASE_URL

# 测试数据库连接
psql "$DATABASE_URL" -c "SELECT version();"
```

### 权限导入失败

```bash
# 检查 RBAC 表是否存在
psql "$DATABASE_URL" -c "\dt rbac_*"

# 重新运行迁移
pnpm db:migrate
```

### 用户不存在错误

确保用户已在系统中注册：

```bash
# 查询用户是否存在
psql "$DATABASE_URL" -c "SELECT id, email FROM users WHERE id = 'user_123456';"
```

## 🛡️ 数据备份建议

在进行权限管理操作前，建议备份相关数据：

```bash
# 备份 RBAC 相关表
pg_dump "$DATABASE_URL" -t rbac_permissions -t rbac_roles -t rbac_role_permissions -t rbac_user_roles > rbac_backup.sql

# 恢复备份
psql "$DATABASE_URL" < rbac_backup.sql
```

## 📞 技术支持

如遇到问题，请检查：

1. **环境变量**：确保 `DATABASE_URL` 正确设置
2. **数据库连接**：确认数据库服务正常运行
3. **表结构**：确认 RBAC 表已正确创建
4. **脚本权限**：确认脚本具有执行权限

## 📚 相关文档

- [RBAC 设计文档](../docs/rbac-permissions.md)
- [权限常量定义](../src/const/rbac.ts)
- [数据库 Schema](../src/database/schemas/rbac.ts)

---

**⚠️ 重要提示**：权限管理直接影响系统安全，请在生产环境中谨慎操作，建议先在测试环境验证。
