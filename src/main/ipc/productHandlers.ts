import { IpcMain } from 'electron';
import { prisma } from '../database/init';

// === Generador de códigos internos ===
const CATEGORY_PREFIXES: Record<string, string> = {
  artesanal: 'ART', artesanales: 'ART',
  comida: 'COM', comidas: 'COM',
  caramelo: 'CAR', caramelos: 'CAR',
  golosina: 'GOL', golosinas: 'GOL',
  bijouterie: 'BIJ', bijoutería: 'BIJ',
  accesorios: 'ACC',
  bebida: 'BEB', bebidas: 'BEB',
  snack: 'SNK', snacks: 'SNK',
  limpieza: 'LIM',
  fiambre: 'FIA', fiambres: 'FIA',
  lacteos: 'LAC', lácteos: 'LAC',
  panaderia: 'PAN', panadería: 'PAN',
  verduleria: 'VER', verdulería: 'VER',
  frutas: 'FRU',
  kiosco: 'KIO',
  varios: 'VAR',
};

function generateInternalBarcode(categoryName?: string): string {
  const prefix = categoryName
    ? (CATEGORY_PREFIXES[categoryName.toLowerCase().trim()] || 'INT')
    : 'INT';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6);
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${prefix}-${timestamp}${random}`;
}

interface CreateProductData {
  barcode?: string; // Opcional - si no se provee, se genera automáticamente
  name: string;
  description?: string;
  price: number;
  cost?: number;
  stock?: number;
  minStock?: number;
  unitsPerBox?: number;
  sellByUnit?: boolean;
  categoryId?: string;
}

interface UpdateProductData extends Partial<CreateProductData> {}

export function registerProductHandlers(ipcMain: IpcMain): void {
  // Obtener todos los productos
  ipcMain.handle('products:getAll', async () => {
    try {
      const products = await prisma.product.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      return { success: true, data: products };
    } catch (error) {
      console.error('Error getting products:', error);
      return { success: false, error: 'Error al obtener productos' };
    }
  });

  // Buscar por código de barras
  ipcMain.handle('products:getByBarcode', async (_, barcode: string) => {
    try {
      const product = await prisma.product.findUnique({
        where: { barcode },
        include: { category: true },
      });
      
      if (!product) {
        return { success: false, error: 'Producto no encontrado', notFound: true };
      }
      
      return { success: true, data: product };
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      return { success: false, error: 'Error al buscar producto' };
    }
  });

  // Obtener por categoría
  ipcMain.handle('products:getByCategory', async (_, categoryId: string) => {
    try {
      const products = await prisma.product.findMany({
        where: { categoryId, active: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      return { success: true, data: products };
    } catch (error) {
      console.error('Error getting products by category:', error);
      return { success: false, error: 'Error al obtener productos de la categoría' };
    }
  });

  // Crear producto
  ipcMain.handle('products:create', async (_, data: CreateProductData) => {
    try {
      // Generar código de barras si no se proveyó
      let barcode = data.barcode?.trim();
      
      if (!barcode) {
        // Obtener nombre de categoría para generar prefijo apropiado
        let categoryName: string | undefined;
        if (data.categoryId) {
          const category = await prisma.category.findUnique({
            where: { id: data.categoryId },
            select: { name: true },
          });
          categoryName = category?.name;
        }
        
        // Generar código único
        barcode = generateInternalBarcode(categoryName);
        
        // Verificar que el código generado sea único (muy improbable que no lo sea)
        let attempts = 0;
        while (attempts < 5) {
          const existingGenerated = await prisma.product.findUnique({
            where: { barcode },
          });
          if (!existingGenerated) break;
          barcode = generateInternalBarcode(categoryName);
          attempts++;
        }
      } else {
        // Verificar si ya existe el código de barras ingresado
        const existing = await prisma.product.findUnique({
          where: { barcode },
        });

        if (existing) {
          return { success: false, error: 'Ya existe un producto con ese código de barras' };
        }
      }

      const product = await prisma.product.create({
        data: {
          barcode,
          name: data.name,
          description: data.description,
          price: data.price,
          cost: data.cost ?? 0,
          stock: data.stock ?? 0,
          minStock: data.minStock ?? 5,
          unitsPerBox: data.unitsPerBox ?? 1,
          sellByUnit: data.sellByUnit ?? true,
          categoryId: data.categoryId,
        },
        include: { category: true },
      });

      return { success: true, data: product };
    } catch (error) {
      console.error('Error creating product:', error);
      return { success: false, error: 'Error al crear producto' };
    }
  });

  // Actualizar producto
  ipcMain.handle('products:update', async (_, id: string, data: UpdateProductData) => {
    try {
      // Si se cambia el barcode, verificar que no exista
      if (data.barcode) {
        const existing = await prisma.product.findFirst({
          where: { barcode: data.barcode, NOT: { id } },
        });
        if (existing) {
          return { success: false, error: 'Ya existe otro producto con ese código de barras' };
        }
      }

      const product = await prisma.product.update({
        where: { id },
        data,
        include: { category: true },
      });

      return { success: true, data: product };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, error: 'Error al actualizar producto' };
    }
  });

  // Eliminar producto (soft delete)
  ipcMain.handle('products:delete', async (_, id: string) => {
    try {
      await prisma.product.update({
        where: { id },
        data: { active: false },
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: 'Error al eliminar producto' };
    }
  });

  // Buscar productos
  ipcMain.handle('products:search', async (_, query: string) => {
    try {
      const products = await prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { name: { contains: query } },
            { barcode: { contains: query } },
            { description: { contains: query } },
          ],
        },
        include: { category: true },
        take: 20,
        orderBy: { name: 'asc' },
      });
      return { success: true, data: products };
    } catch (error) {
      console.error('Error searching products:', error);
      return { success: false, error: 'Error al buscar productos' };
    }
  });

  // Obtener productos con stock bajo
  ipcMain.handle('products:getLowStock', async () => {
    try {
      const products = await prisma.product.findMany({
        where: {
          active: true,
          stock: { lte: prisma.product.fields.minStock },
        },
        include: { category: true },
        orderBy: { stock: 'asc' },
      });
      return { success: true, data: products };
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return { success: false, error: 'Error al obtener productos con stock bajo' };
    }
  });
}
