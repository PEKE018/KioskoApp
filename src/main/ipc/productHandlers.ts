import { IpcMain } from 'electron';
import { logger } from '../utils/logger';
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
  isCombo?: boolean;
  components?: { productId: string; quantity: number }[]; // Para combos
}

interface UpdateProductData extends Partial<CreateProductData> {}

export function registerProductHandlers(ipcMain: IpcMain): void {
  // Obtener todos los productos
  ipcMain.handle('products:getAll', async () => {
    try {
      const products = await prisma.product.findMany({
        where: { active: true },
        include: { 
          category: true,
          comboComponents: {
            include: {
              component: {
                select: { id: true, name: true, barcode: true, stock: true, price: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' },
      });
      return { success: true, data: products };
    } catch (error) {
      logger.error('Product', 'Error getting products', error);
      return { success: false, error: 'Error al obtener productos' };
    }
  });

  // Buscar por código de barras - puede devolver múltiples productos
  ipcMain.handle('products:getByBarcode', async (_, barcode: string) => {
    try {
      const products = await prisma.product.findMany({
        where: { barcode, active: true },
        include: { category: true },
      });
      
      if (products.length === 0) {
        return { success: false, error: 'Producto no encontrado', notFound: true };
      }
      
      // Si hay un solo producto, devolver como antes para compatibilidad
      if (products.length === 1) {
        return { success: true, data: products[0] };
      }
      
      // Si hay múltiples, devolver array con flag
      return { success: true, data: products, multiple: true };
    } catch (error) {
      logger.error('Product', 'Error getting product by barcode', error);
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
      logger.error('Product', 'Error getting products by category', error);
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
          const existingGenerated = await prisma.product.findFirst({
            where: { barcode },
          });
          if (!existingGenerated) break;
          barcode = generateInternalBarcode(categoryName);
          attempts++;
        }
      }
      // Ya no verificamos duplicados - se permiten códigos de barras repetidos

      const product = await prisma.product.create({
        data: {
          barcode,
          name: data.name,
          description: data.description,
          price: data.price,
          cost: data.cost ?? 0,
          stock: data.isCombo ? 0 : (data.stock ?? 0), // Combos no tienen stock propio
          minStock: data.isCombo ? 0 : (data.minStock ?? 5),
          unitsPerBox: data.unitsPerBox ?? 1,
          sellByUnit: data.sellByUnit ?? true,
          categoryId: data.categoryId,
          isCombo: data.isCombo ?? false,
        },
        include: { category: true },
      });

      // Si es combo y tiene componentes, crearlos
      if (data.isCombo && data.components && data.components.length > 0) {
        for (const comp of data.components) {
          await prisma.comboComponent.create({
            data: {
              comboId: product.id,
              componentId: comp.productId,
              quantity: comp.quantity,
            },
          });
        }
        
        // Re-obtener el producto con los componentes
        const productWithComponents = await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            category: true,
            comboComponents: {
              include: {
                component: {
                  select: { id: true, name: true, barcode: true, stock: true, price: true }
                }
              }
            }
          },
        });
        return { success: true, data: productWithComponents };
      }

      return { success: true, data: product };
    } catch (error) {
      logger.error('Product', 'Error creating product', error);
      return { success: false, error: 'Error al crear producto' };
    }
  });

  // Actualizar producto
  ipcMain.handle('products:update', async (_, id: string, data: UpdateProductData) => {
    try {
      // Extraer components del data para manejarlo separadamente
      const { components, ...productData } = data;
      
      // Si se está convirtiendo a combo, ajustar stock
      if (productData.isCombo === true) {
        productData.stock = 0;
        productData.minStock = 0;
      }

      const product = await prisma.product.update({
        where: { id },
        data: productData,
        include: { category: true },
      });

      // Si tiene componentes, actualizar la relación
      if (components !== undefined) {
        // Eliminar componentes existentes
        await prisma.comboComponent.deleteMany({
          where: { comboId: id },
        });
        
        // Crear nuevos componentes
        if (components.length > 0) {
          for (const comp of components) {
            await prisma.comboComponent.create({
              data: {
                comboId: id,
                componentId: comp.productId,
                quantity: comp.quantity,
              },
            });
          }
        }
        
        // Re-obtener con componentes
        const productWithComponents = await prisma.product.findUnique({
          where: { id },
          include: {
            category: true,
            comboComponents: {
              include: {
                component: {
                  select: { id: true, name: true, barcode: true, stock: true, price: true }
                }
              }
            }
          },
        });
        return { success: true, data: productWithComponents };
      }

      return { success: true, data: product };
    } catch (error) {
      logger.error('Product', 'Error updating product', error);
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
      logger.error('Product', 'Error deleting product', error);
      return { success: false, error: 'Error al eliminar producto' };
    }
  });

  // Buscar productos
  ipcMain.handle('products:search', async (_, query: string) => {
    try {
      // SQLite no soporta búsqueda case-insensitive nativa
      // Obtenemos todos los productos activos y filtramos en JavaScript
      const allProducts = await prisma.product.findMany({
        where: { active: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      
      const lowerQuery = query.toLowerCase();
      const products = allProducts.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) ||
        p.barcode.toLowerCase().includes(lowerQuery) ||
        (p.description && p.description.toLowerCase().includes(lowerQuery))
      ).slice(0, 20);
      
      return { success: true, data: products };
    } catch (error) {
      logger.error('Product', 'Error searching products', error);
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
      logger.error('Product', 'Error getting low stock products', error);
      return { success: false, error: 'Error al obtener productos con stock bajo' };
    }
  });

  // === HANDLERS PARA COMBOS ===

  // Obtener solo productos simples (no combos) para seleccionar como componentes
  ipcMain.handle('products:getSimple', async () => {
    try {
      const products = await prisma.product.findMany({
        where: { 
          active: true,
          isCombo: false, // Solo productos simples, no combos
        },
        include: { category: true },
        orderBy: { name: 'asc' },
      });
      return { success: true, data: products };
    } catch (error) {
      logger.error('Product', 'Error getting simple products', error);
      return { success: false, error: 'Error al obtener productos simples' };
    }
  });

  // Obtener solo combos
  ipcMain.handle('products:getCombos', async () => {
    try {
      const combos = await prisma.product.findMany({
        where: { 
          active: true,
          isCombo: true,
        },
        include: { 
          category: true,
          comboComponents: {
            include: {
              component: {
                select: { id: true, name: true, barcode: true, stock: true, price: true }
              }
            }
          }
        },
        orderBy: { name: 'asc' },
      });
      return { success: true, data: combos };
    } catch (error) {
      logger.error('Product', 'Error getting combos', error);
      return { success: false, error: 'Error al obtener combos' };
    }
  });

  // Obtener componentes de un combo específico
  ipcMain.handle('products:getComboComponents', async (_, comboId: string) => {
    try {
      const components = await prisma.comboComponent.findMany({
        where: { comboId },
        include: {
          component: {
            select: { id: true, name: true, barcode: true, stock: true, price: true, cost: true }
          }
        },
      });
      return { success: true, data: components };
    } catch (error) {
      logger.error('Product', 'Error getting combo components', error);
      return { success: false, error: 'Error al obtener componentes del combo' };
    }
  });

  // Verificar stock disponible para un combo
  ipcMain.handle('products:checkComboStock', async (_, comboId: string, quantity: number = 1) => {
    try {
      const components = await prisma.comboComponent.findMany({
        where: { comboId },
        include: {
          component: {
            select: { id: true, name: true, stock: true }
          }
        },
      });

      // Verificar si hay suficiente stock de cada componente
      const stockStatus = components.map(comp => ({
        productId: comp.component.id,
        name: comp.component.name,
        required: comp.quantity * quantity,
        available: comp.component.stock,
        sufficient: comp.component.stock >= comp.quantity * quantity,
      }));

      const allSufficient = stockStatus.every(s => s.sufficient);
      
      return { 
        success: true, 
        data: { 
          available: allSufficient,
          components: stockStatus,
          maxQuantity: allSufficient 
            ? Math.min(...stockStatus.map(s => Math.floor(s.available / (s.required / quantity))))
            : 0
        } 
      };
    } catch (error) {
      logger.error('Product', 'Error checking combo stock', error);
      return { success: false, error: 'Error al verificar stock del combo' };
    }
  });
}
