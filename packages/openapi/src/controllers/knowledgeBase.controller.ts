import { Context } from 'hono';

import { BaseController } from '../common/base.controller';
import { FileUploadService } from '../services/file.service';
import { KnowledgeBaseService } from '../services/knowledgeBase.service';
import {
  CreateKnowledgeBaseRequest,
  KnowledgeBaseFileListQuery,
  KnowledgeBaseListQuery,
  UpdateKnowledgeBaseRequest,
} from '../types/knowledgeBase.type';

/**
 * 知识库控制器
 * 处理知识库相关的HTTP请求
 */
export class KnowledgeBaseController extends BaseController {
  /**
   * 获取知识库列表
   * GET /knowledge-bases
   */
  async getKnowledgeBases(c: Context) {
    try {
      const userId = this.getUserId(c)!;
      const query = this.getQuery(c) as KnowledgeBaseListQuery;

      const db = await this.getDatabase();
      const knowledgeBaseService = new KnowledgeBaseService(db, userId);

      const result = await knowledgeBaseService.getKnowledgeBaseList(query);

      return this.success(c, result, 'Knowledge bases retrieved successfully');
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * 获取单个知识库详情
   * GET /knowledge-bases/:id
   */
  async getKnowledgeBase(c: Context) {
    try {
      const userId = this.getUserId(c)!;
      const { id } = this.getParams(c);

      const db = await this.getDatabase();
      const knowledgeBaseService = new KnowledgeBaseService(db, userId);

      const result = await knowledgeBaseService.getKnowledgeBaseDetail(id);

      return this.success(c, result, 'Knowledge base retrieved successfully');
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * 获取知识库下的文件列表
   * GET /knowledge-bases/:id/files
   */
  async getKnowledgeBaseFiles(c: Context) {
    try {
      const userId = this.getUserId(c)!;
      const { id } = this.getParams(c);
      const query = this.getQuery(c) as KnowledgeBaseFileListQuery;

      const db = await this.getDatabase();
      const fileService = new FileUploadService(db, userId);

      const result = await fileService.getKnowledgeBaseFileList(id, query);

      return this.success(c, result, 'Knowledge base files retrieved successfully');
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * 创建知识库
   * POST /knowledge-bases
   */
  async createKnowledgeBase(c: Context) {
    try {
      const userId = this.getUserId(c)!;
      const body = await this.getBody<CreateKnowledgeBaseRequest>(c);

      const db = await this.getDatabase();
      const knowledgeBaseService = new KnowledgeBaseService(db, userId);

      const result = await knowledgeBaseService.createKnowledgeBase(body);

      return this.success(c, result, 'Knowledge base created successfully');
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * 更新知识库
   * PATCH /knowledge-bases/:id
   */
  async updateKnowledgeBase(c: Context) {
    try {
      const userId = this.getUserId(c)!;
      const { id } = this.getParams(c);
      const body = await this.getBody<UpdateKnowledgeBaseRequest>(c);

      const db = await this.getDatabase();
      const knowledgeBaseService = new KnowledgeBaseService(db, userId);

      const result = await knowledgeBaseService.updateKnowledgeBase(id, body);

      return this.success(c, result, 'Knowledge base updated successfully');
    } catch (error) {
      return this.handleError(c, error);
    }
  }

  /**
   * 删除知识库
   * DELETE /knowledge-bases/:id
   */
  async deleteKnowledgeBase(c: Context) {
    try {
      const userId = this.getUserId(c)!;
      const { id } = this.getParams(c);

      const db = await this.getDatabase();
      const knowledgeBaseService = new KnowledgeBaseService(db, userId);

      const result = await knowledgeBaseService.deleteKnowledgeBase(id);

      return this.success(c, result, 'Knowledge base deleted successfully');
    } catch (error) {
      return this.handleError(c, error);
    }
  }
}
