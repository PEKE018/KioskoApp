import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiUser,
  FiShield,
} from 'react-icons/fi';

interface User {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'CASHIER';
  active: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    pin: '',
    role: 'CASHIER' as 'ADMIN' | 'CASHIER',
  });
  const [error, setError] = useState('');

  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const result = await window.api.users.getAll() as {
        success: boolean;
        data?: User[];
        error?: string;
      };
      
      if (result.success && result.data) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const openModal = (user?: User) => {
    setError('');
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        pin: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        pin: '',
        role: 'CASHIER',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        // Actualizar usuario
        const updateData: Partial<typeof formData> = {
          username: formData.username,
          name: formData.name,
          role: formData.role,
        };
        
        if (formData.pin) {
          updateData.pin = formData.pin;
        }

        const result = await window.api.users.update(editingUser.id, updateData) as {
          success: boolean;
          error?: string;
        };

        if (result.success) {
          await loadUsers();
          setShowModal(false);
        } else {
          setError(result.error || 'Error al actualizar usuario');
        }
      } else {
        // Crear usuario
        if (!formData.password) {
          setError('La contraseña es requerida');
          return;
        }

        const result = await window.api.users.create(formData) as {
          success: boolean;
          error?: string;
        };

        if (result.success) {
          await loadUsers();
          setShowModal(false);
        } else {
          setError(result.error || 'Error al crear usuario');
        }
      }
    } catch (error) {
      setError('Error de conexión');
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('No puede eliminarse a sí mismo');
      return;
    }

    if (confirm(`¿Desactivar al usuario "${user.name}"?`)) {
      try {
        const result = await window.api.users.delete(user.id) as {
          success: boolean;
        };
        
        if (result.success) {
          await loadUsers();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-app-muted">
            Gestión de usuarios y permisos
          </p>
        </div>

        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <FiPlus size={20} />
          Nuevo Usuario
        </button>
      </div>

      {/* Lista de usuarios */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <div
            key={user.id}
            className={`card ${
              !user.active ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    user.role === 'ADMIN' ? 'bg-primary-600' : 'bg-app-muted'
                  }`}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg">{user.name}</p>
                  <p className="text-sm text-app-muted">@{user.username}</p>
                </div>
              </div>

              {user.id !== currentUser?.id && (
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(user)}
                    className="p-2 rounded-lg hover:bg-app-bg text-app-muted hover:text-primary-400 transition-colors"
                  >
                    <FiEdit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-2 rounded-lg hover:bg-app-bg text-app-muted hover:text-stock-critical transition-colors"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2">
              {user.role === 'ADMIN' ? (
                <span className="flex items-center gap-1 text-sm text-primary-400 bg-primary-400/20 px-2 py-1 rounded-full">
                  <FiShield size={14} />
                  Administrador
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-app-muted bg-app-bg px-2 py-1 rounded-full">
                  <FiUser size={14} />
                  Cajero
                </span>
              )}

              {!user.active && (
                <span className="text-sm text-stock-critical bg-stock-critical/20 px-2 py-1 rounded-full">
                  Inactivo
                </span>
              )}
            </div>

            <p className="text-xs text-app-muted">
              Creado: {formatDate(user.createdAt)}
            </p>
          </div>
        ))}

        {/* Card para agregar */}
        <button
          onClick={() => openModal()}
          className="card border-dashed border-2 flex flex-col items-center justify-center py-8 text-app-muted hover:text-primary-400 hover:border-primary-400 transition-colors min-h-[180px]"
        >
          <FiPlus size={32} className="mb-2" />
          <span>Agregar usuario</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">
              {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-stock-critical/20 border border-stock-critical/30 rounded-lg text-stock-critical text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-muted mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, name: e.target.value }))
                    }
                    className="input"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-muted mb-1">
                    Usuario *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, username: e.target.value }))
                    }
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-app-muted mb-1">
                    {editingUser ? 'Nueva contraseña' : 'Contraseña *'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((d) => ({ ...d, password: e.target.value }))
                    }
                    className="input"
                    required={!editingUser}
                    placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-muted mb-1">
                    PIN (4 dígitos)
                  </label>
                  <input
                    type="text"
                    value={formData.pin}
                    onChange={(e) =>
                      setFormData((d) => ({
                        ...d,
                        pin: e.target.value.replace(/\D/g, '').slice(0, 4),
                      }))
                    }
                    className="input font-mono text-center"
                    maxLength={4}
                    placeholder="0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-app-muted mb-2">
                  Rol
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((d) => ({ ...d, role: 'CASHIER' }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.role === 'CASHIER'
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-app-border hover:border-primary-500/50'
                    }`}
                  >
                    <FiUser size={24} />
                    <span className="font-medium">Cajero</span>
                    <span className="text-xs text-app-muted text-center">
                      Ventas y carga de stock
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((d) => ({ ...d, role: 'ADMIN' }))}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.role === 'ADMIN'
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-app-border hover:border-primary-500/50'
                    }`}
                  >
                    <FiShield size={24} />
                    <span className="font-medium">Administrador</span>
                    <span className="text-xs text-app-muted text-center">
                      Acceso completo
                    </span>
                  </button>
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
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
