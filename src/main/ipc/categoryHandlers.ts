import { IpcMain } from 'electron';
import { prisma } from '../database/init';

interface CreateCategoryData {
  name: string;
  color?: string;
  icon?: string;
}

interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export function registerCategoryHandlers(ipcMain: IpcMain): void {
  // Obtener todas las categorías
  ipcMain.handle('categories:getAll', async () => {
    try {
      const categories = await prisma.category.findMany({
        where: { active: true },
        orderBy: { order: 'asc' },
        include: {
          _count: {
            select: { products: { where: { active: true } } },
          },
        },
      });
      return { success: true, data: categories };
    } catch (error) {
      console.error('Error getting categories:', error);
      return { success: false, error: 'Error al obtener categorías' };
    }
  });

  // Crear categoría
  ipcMain.handle('categories:create', async (_, data: CreateCategoryData) => {
    try {
      // Obtener el máximo orden actual
      const maxOrder = await prisma.category.aggregate({
        _max: { order: true },
      });

      const category = await prisma.category.create({
        data: {
          name: data.name,
          color: data.color ?? '#3b82f6',
          icon: data.icon,
          order: (maxOrder._max.order ?? 0) + 1,
        },
      });

      return { success: true, data: category };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: 'Error al crear categoría' };
    }
  });

  // Actualizar categoría
  ipcMain.handle('categories:update', async (_, id: string, data: UpdateCategoryData) => {
    try {
      const category = await prisma.category.update({
        where: { id },
        data,
      });
      return { success: true, data: category };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: 'Error al actualizar categoría' };
    }
  });

  // Eliminar categoría (soft delete)
  ipcMain.handle('categories:delete', async (_, id: string) => {
    try {
      // Verificar si tiene productos
      const productsCount = await prisma.product.count({
        where: { categoryId: id, active: true },
      });

      if (productsCount > 0) {
        return { 
          success: false, 
          error: `No se puede eliminar. Tiene ${productsCount} productos asociados.` 
        };
      }

      await prisma.category.update({
        where: { id },
        data: { active: false },
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: 'Error al eliminar categoría' };
    }
  });

  // Reordenar categorías
  ipcMain.handle('categories:reorder', async (_, ids: string[]) => {
    try {
      // Actualizar el orden de cada categoría
      const updates = ids.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { order: index + 1 },
        })
      );

      await prisma.$transaction(updates);

      return { success: true };
    } catch (error) {
      console.error('Error reordering categories:', error);
      return { success: false, error: 'Error al reordenar categorías' };
    }
  });
}
