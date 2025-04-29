export async function onRequestPost(context) {
  try {
    // 检查认证
    const authResult = await validateAuth(context);
    if (!authResult.valid) {
      return new Response(JSON.stringify({ error: '未授权访问' }), {
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
    
    // 不使用SQL事务，而是使用batch操作
    let result;
    let categoryId = id;
    
    // 更新或创建分类
    if (categoryId) {
      // 先检查分类是否存在
      const existingCategory = await env.DB.prepare("SELECT id FROM categories WHERE id = ?")
        .bind(categoryId)
        .first();
      
      if (!existingCategory) {
        return new Response(JSON.stringify({ error: '分类不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // 检查slug是否与其他分类冲突
      const slugExists = await env.DB.prepare("SELECT id FROM categories WHERE slug = ? AND id != ?")
        .bind(categorySlug, categoryId)
        .first();
      
      if (slugExists) {
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
          return new Response(JSON.stringify({ 
            error: '父分类不存在'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 防止循环引用
        if (parent_id === categoryId) {
          return new Response(JSON.stringify({ 
            error: '不能将分类自身设为父分类'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // 检查是否会形成循环
        let currentParentId = parent_id;
        while (currentParentId) {
          const parent = await env.DB.prepare('SELECT parent_id FROM categories WHERE id = ?')
            .bind(currentParentId).first();
          
          if (!parent) break;
          
          if (parent.parent_id === categoryId) {
            return new Response(JSON.stringify({ 
              error: '不能将分类的子分类设为其父分类，这会导致循环引用'
            }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          currentParentId = parent.parent_id;
        }
      }
      
      // 更新分类
      const updateStmt = env.DB.prepare(`
        UPDATE categories 
        SET name = ?, 
            slug = ?, 
            description = ?, 
            parent_id = ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      // 使用批处理更新并获取结果
      const batchResults = await env.DB.batch([
        updateStmt.bind(name, categorySlug, description || null, parent_id || null, categoryId),
        env.DB.prepare(`
          SELECT c.*, p.name as parent_name
          FROM categories c
          LEFT JOIN categories p ON c.parent_id = p.id
          WHERE c.id = ?
        `).bind(categoryId)
      ]);
      
      result = batchResults[1].results[0];
    } else {
      // 创建新分类
      // 检查slug是否已存在
      const slugExists = await env.DB.prepare("SELECT id FROM categories WHERE slug = ?")
        .bind(categorySlug)
        .first();
      
      if (slugExists) {
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
          return new Response(JSON.stringify({ 
            error: '父分类不存在'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // 插入新分类
      const insertStmt = env.DB.prepare(`
        INSERT INTO categories (name, slug, description, parent_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      const insert = await insertStmt.bind(name, categorySlug, description || null, parent_id || null).run();
      
      if (!insert.success) {
        throw new Error('创建分类失败');
      }
      
      categoryId = insert.meta?.last_row_id;
      
      // 获取新创建的分类数据
      result = await env.DB.prepare(`
        SELECT c.*, p.name as parent_name
        FROM categories c
        LEFT JOIN categories p ON c.parent_id = p.id
        WHERE c.id = ?
      `).bind(categoryId).first();
    }
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('保存分类失败:', error);
    return new Response(JSON.stringify({ error: error.message || '服务器内部错误' }), {
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

    // 检查分类是否存在
    const categoryExists = await env.DB.prepare(
      "SELECT id FROM categories WHERE id = ?"
    ).bind(categoryId).first();

    if (!categoryExists) {
      return new Response(JSON.stringify({ error: '分类不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查是否有子分类
    const hasChildren = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM categories WHERE parent_id = ?"
    ).bind(categoryId).first();

    if (hasChildren && hasChildren.count > 0) {
      return new Response(JSON.stringify({ 
        error: '无法删除含有子分类的分类，请先删除所有子分类' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查该分类是否关联了文章
    const hasAssociatedPosts = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM posts WHERE category_id = ?"
    ).bind(categoryId).first();

    if (hasAssociatedPosts && hasAssociatedPosts.count > 0) {
      return new Response(JSON.stringify({ 
        error: '无法删除已关联文章的分类，请先更改相关文章的分类或删除相关文章' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 删除分类
    await env.DB.prepare(
      "DELETE FROM categories WHERE id = ?"
    ).bind(categoryId).run();

    return new Response(JSON.stringify({ 
      success: true,
      message: '分类已成功删除'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('删除分类失败:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '服务器内部错误' 
    }), {
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