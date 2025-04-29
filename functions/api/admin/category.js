export async function onRequestPost(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 解析请求体
    const requestData = await context.request.json();
    const { id, name, slug, description, parent_id } = requestData;
    
    // 验证必填字段
    if (!name) {
      return new Response(JSON.stringify({ error: '分类名称不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { env } = context;
    
    // 如果没有提供slug，则根据名称生成
    let categorySlug = slug;
    if (!categorySlug) {
      categorySlug = name.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
    }
    
    // 开始事务
    await env.DB.prepare('BEGIN').run();
    
    try {
      // 检查slug是否已存在（除了当前更新的分类）
      let slugCheckQuery = 'SELECT id FROM categories WHERE slug = ? AND id != ?';
      let slugCheckParams = [categorySlug, id || '0'];
      
      if (!id) {
        // 新建分类时只需检查slug是否存在
        slugCheckQuery = 'SELECT id FROM categories WHERE slug = ?';
        slugCheckParams = [categorySlug];
      }
      
      const slugExists = await env.DB.prepare(slugCheckQuery).bind(...slugCheckParams).first();
      
      if (slugExists) {
        await env.DB.prepare('ROLLBACK').run();
        return new Response(JSON.stringify({ 
          error: '该分类别名已存在，请使用其他别名'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 如果有父分类，检查父分类是否存在
      if (parent_id) {
        const parentExists = await env.DB.prepare('SELECT id FROM categories WHERE id = ?')
          .bind(parent_id).first();
          
        if (!parentExists) {
          await env.DB.prepare('ROLLBACK').run();
          return new Response(JSON.stringify({ 
            error: '父分类不存在'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 检查是否形成循环关系（防止将父分类设置为自己的子分类）
        if (id) {
          const checkCircular = async (currentId, targetId) => {
            if (currentId === targetId) {
              return true;
            }
            
            const children = await env.DB.prepare('SELECT id FROM categories WHERE parent_id = ?')
              .bind(currentId).all();
              
            if (!children.success || !children.results) {
              return false;
            }
            
            for (const child of children.results) {
              if (await checkCircular(child.id, targetId)) {
                return true;
              }
            }
            
            return false;
          };
          
          if (await checkCircular(id, parent_id)) {
            await env.DB.prepare('ROLLBACK').run();
            return new Response(JSON.stringify({ 
              error: '不能将分类的子分类设为其父分类，这会导致循环引用'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      }
      
      let result;
      
      // 更新或创建分类
      if (id) {
        // 更新现有分类
        const updateSql = `
          UPDATE categories 
          SET name = ?, 
              slug = ?, 
              description = ?, 
              parent_id = ?,
              updated_at = datetime('now') 
          WHERE id = ?
        `;
        
        await env.DB.prepare(updateSql)
          .bind(name, categorySlug, description || null, parent_id || null, id)
          .run();
          
        // 获取更新后的分类信息
        result = await env.DB.prepare(`
          SELECT c.*, p.name as parent_name
          FROM categories c
          LEFT JOIN categories p ON c.parent_id = p.id
          WHERE c.id = ?
        `).bind(id).first();
      } else {
        // 创建新分类
        const insertSql = `
          INSERT INTO categories (name, slug, description, parent_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `;
        
        const insert = await env.DB.prepare(insertSql)
          .bind(name, categorySlug, description || null, parent_id || null)
          .run();
          
        if (!insert.success) {
          throw new Error('Failed to create category');
        }
        
        // 获取新创建的分类信息
        result = await env.DB.prepare(`
          SELECT c.*, p.name as parent_name
          FROM categories c
          LEFT JOIN categories p ON c.parent_id = p.id
          WHERE c.id = ?
        `).bind(insert.meta.last_row_id).first();
      }
      
      // 提交事务
      await env.DB.prepare('COMMIT').run();
      
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      // 发生错误时回滚事务
      await env.DB.prepare('ROLLBACK').run();
      throw error;
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 获取URL参数中的分类ID
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(JSON.stringify({ error: '缺少分类ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const { env } = context;
    
    // 开始事务
    await env.DB.prepare('BEGIN').run();
    
    try {
      // 检查分类是否存在
      const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?')
        .bind(id).first();
        
      if (!category) {
        await env.DB.prepare('ROLLBACK').run();
        return new Response(JSON.stringify({ error: '分类不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 检查分类是否有子分类
      const childrenCheck = await env.DB.prepare('SELECT id FROM categories WHERE parent_id = ?')
        .bind(id).all();
        
      if (childrenCheck.success && childrenCheck.results && childrenCheck.results.length > 0) {
        await env.DB.prepare('ROLLBACK').run();
        return new Response(JSON.stringify({ 
          error: '该分类有子分类，无法删除。请先删除或移动其子分类。'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 检查该分类是否被文章使用
      const postsCheck = await env.DB.prepare('SELECT id FROM posts WHERE category_id = ? LIMIT 1')
        .bind(id).first();
        
      if (postsCheck) {
        await env.DB.prepare('ROLLBACK').run();
        return new Response(JSON.stringify({ 
          error: '该分类下有文章，无法删除。请先移动或删除相关文章。'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 删除分类
      await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
      
      // 提交事务
      await env.DB.prepare('COMMIT').run();
      
      return new Response(JSON.stringify({ 
        success: true,
        message: '分类删除成功'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      // 发生错误时回滚事务
      await env.DB.prepare('ROLLBACK').run();
      throw error;
    }
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestGet(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { env, params } = context;
    const categoryId = params.id;

    if (!categoryId) {
      return new Response(JSON.stringify({ error: '分类ID不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 从D1数据库查询分类
    const result = await env.DB.prepare(`
      SELECT c.id, c.name, c.slug, c.description, c.parent_id, 
             c.created_at, c.updated_at, 
             p.name as parent_name 
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `).bind(categoryId).first();

    if (!result) {
      return new Response(JSON.stringify({ error: '分类不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取子分类
    const childrenResult = await env.DB.prepare(`
      SELECT id, name, slug, description, parent_id, created_at, updated_at
      FROM categories
      WHERE parent_id = ?
    `).bind(categoryId).all();

    const children = childrenResult.success ? childrenResult.results : [];

    // 获取相关文章数量
    const postsCountResult = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM posts_categories
      WHERE category_id = ?
    `).bind(categoryId).first();

    const postsCount = postsCountResult ? postsCountResult.count : 0;

    const category = {
      ...result,
      children,
      postsCount
    };

    return new Response(JSON.stringify({ category }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '服务器内部错误' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 验证认证令牌
async function validateAuth(context) {
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false };
  }
  
  const token = authHeader.substring(7);
  
  // 在实际应用中，这里应该验证令牌
  // 简单示例，实际应用需要更完善的验证机制
  if (token) {
    return { valid: true, user: { role: 'admin' } };
  }
  
  return { valid: false };
} 