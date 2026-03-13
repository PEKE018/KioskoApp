import { useEffect, useState } from 'react';
import { useProductsStore, Category } from '../stores/productsStore';
import { FiPlus, FiEdit2, FiTrash2, FiGrid } from 'react-icons/fi';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#6b7280',
];

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6' });

  const {
    categories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useProductsStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, color: category.color });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', color: '#3b82f6' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      await updateCategory(editingCategory.id, formData);
    } else {
      await createCategory(formData);
    }

    setShowModal(false);
  };

  const handleDelete = async (category: Category) => {
    if (category._count && category._count.products > 0) {
      alert(`No se puede eliminar "${category.name}" porque tiene ${category._count.products} productos asociados.`);
      return;
    }
    
    if (confirm(`¿Eliminar la categoría "${category.name}"?`)) {
      await deleteCategory(category.id);
    }
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Categorías</h1>
          <p className="text-app-muted">
            Organiza tus productos en categorías
          </p>
        </div>

        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <FiPlus size={20} />
          Nueva Categoría
        </button>
      </div>

      {/* Grid de categorías */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="card group relative"
            style={{
              borderColor: category.color,
              borderWidth: '2px',
            }}
          >
            {/* Acciones (visible en hover) */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openModal(category)}
                className="p-2 rounded-lg bg-app-bg/80 backdrop-blur text-app-muted hover:text-primary-400 transition-colors"
              >
                <FiEdit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(category)}
                className="p-2 rounded-lg bg-app-bg/80 backdrop-blur text-app-muted hover:text-stock-critical transition-colors"
              >
                <FiTrash2 size={16} />
              </button>
            </div>

            {/* Contenido */}
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                style={{ backgroundColor: `${category.color}20` }}
              >
                <FiGrid size={32} style={{ color: category.color }} />
              </div>
              <h3 className="font-bold text-lg">{category.name}</h3>
              <p className="text-sm text-app-muted">
                {category._count?.products || 0} productos
              </p>
            </div>
          </div>
        ))}

        {/* Card para agregar */}
        <button
          onClick={() => openModal()}
          className="card border-dashed border-2 flex flex-col items-center justify-center py-8 text-app-muted hover:text-primary-400 hover:border-primary-400 transition-colors"
        >
          <FiPlus size={32} className="mb-2" />
          <span>Agregar categoría</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-app-muted mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, name: e.target.value }))
                  }
                  className="input"
                  placeholder="Ej: Golosinas"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-2">
                  Color
                </label>
                <div className="grid grid-cols-9 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData((d) => ({ ...d, color }))}
                      className={`w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                        formData.color === color
                          ? 'ring-2 ring-offset-2 ring-offset-app-card ring-white'
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-app-bg rounded-lg">
                <p className="text-sm text-app-muted mb-2">Vista previa:</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${formData.color}20` }}
                  >
                    <FiGrid style={{ color: formData.color }} />
                  </div>
                  <span className="font-medium">
                    {formData.name || 'Nombre de categoría'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingCategory ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
