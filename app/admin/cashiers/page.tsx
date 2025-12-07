'use client';

import { useEffect, useState } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Plus,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

type CashierStatus = 'active' | 'on_break' | 'offline' | 'suspended' | string;

type Permissions = {
  can_create_orders: boolean;
  can_cancel_orders: boolean;
  can_apply_discounts: boolean;
  can_process_refunds: boolean;
  can_view_reports: boolean;
};

interface Cashier {
  id: string;
  user_id: string;
  restaurant_id: string;
  cashier_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  status: CashierStatus;
  is_active: boolean;
  total_orders_processed?: number;
  total_sales_amount?: number;
  last_active_at?: string | null;
  profile_image_url?: string | null;
  permissions?: Permissions;
  created_at?: string;
  updated_at?: string;
}

type ModalType = '' | 'view' | 'edit' | 'delete' | 'create';

interface CreateCashierForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  restaurant_id: string;
  permissions: Permissions;
}

export default function CashierManagement() {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | CashierStatus>('all');
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [createForm, setCreateForm] = useState<CreateCashierForm>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    restaurant_id: '',
    permissions: {
      can_create_orders: true,
      can_cancel_orders: false,
      can_apply_discounts: false,
      can_process_refunds: false,
      can_view_reports: false,
    },
  });

  const [editForm, setEditForm] = useState<Partial<Cashier>>({});

  useEffect(() => {
    fetchCashiers();
  }, [currentPage, pageSize, searchTerm, filterStatus]);

  const fetchCashiers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifi?. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const res = await fetch(`${API_URL}/cashier/getall?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Erreur lors du chargement des caissiers');
      const data = await res.json();
      if (data.success && data.data) {
        setCashiers(data.data as Cashier[]);
        const count = data.pagination?.total_items ?? data.count ?? data.total ?? data.data.length;
        setTotalCount(count);
        const pages = data.pagination?.total_pages || Math.max(1, Math.ceil(Math.max(count, 1) / pageSize));
        setTotalPages(pages);
      }
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setShowModal(false);
    setModalType('');
    setSelectedCashier(null);
    setCreateForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone: '',
      restaurant_id: '',
      permissions: {
        can_create_orders: true,
        can_cancel_orders: false,
        can_apply_discounts: false,
        can_process_refunds: false,
        can_view_reports: false,
      },
    });
    setEditForm({});
  };

  const handleCreate = async () => {
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Non authentifi?');

      const res = await fetch(`${API_URL}/auth/register/cashier`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '?chec de cr?ation');
      }

      await fetchCashiers();
      resetAndClose();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCashier) return;
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Non authentifi?');

      const payload: any = { ...editForm };
      delete payload.id;

      const res = await fetch(`${API_URL}/cashier/update/${selectedCashier.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '?chec de mise ? jour');
      }

      await fetchCashiers();
      resetAndClose();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCashier) return;
    try {
      setSaveLoading(true);
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('Non authentifi?');

      const res = await fetch(`${API_URL}/cashier/delete/${selectedCashier.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || '?chec de suppression');
      }

      await fetchCashiers();
      resetAndClose();
    } catch (e: any) {
      setError(e.message || 'Erreur inconnue');
    } finally {
      setSaveLoading(false);
    }
  };

  const openModal = (type: ModalType, cashier?: Cashier) => {
    setModalType(type);
    setShowModal(true);
    if (cashier) {
      setSelectedCashier(cashier);
      setEditForm({
        first_name: cashier.first_name,
        last_name: cashier.last_name,
        phone: cashier.phone,
        email: cashier.email || '',
        status: cashier.status,
        is_active: cashier.is_active,
        permissions: cashier.permissions,
        restaurant_id: cashier.restaurant_id,
      });
    } else {
      setSelectedCashier(null);
    }
  };

  const renderStatusBadge = (status: CashierStatus) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      on_break: 'bg-yellow-100 text-yellow-700',
      offline: 'bg-gray-100 text-gray-700',
      suspended: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caissiers</h1>
          <p className="text-gray-500">Recherche, filtres et gestion des caissiers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <Plus size={16} /> Nouveau caissier
          </button>
          <button
            onClick={fetchCashiers}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} /> Rafra?chir
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Rechercher nom, email ou t?l?phone"
            className="pl-9 pr-3 py-2 border rounded-lg min-w-[260px]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="on_break">En pause</option>
          <option value="offline">Hors ligne</option>
          <option value="suspended">Suspendu</option>
        </select>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Nom</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Restaurant</th>
                <th className="px-4 py-3 text-left">Statut</th>
                <th className="px-4 py-3 text-left">Actif</th>
                <th className="px-4 py-3 text-left">Commandes</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">Chargement...</td>
                </tr>
              ) : cashiers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">Aucun caissier</td>
                </tr>
              ) : (
                cashiers.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{c.first_name} {c.last_name}</td>
                    <td className="px-4 py-3 space-y-1">
                      {c.email && <div className="flex items-center gap-2 text-gray-700"><Mail size={14}/>{c.email}</div>}
                      <div className="flex items-center gap-2 text-gray-700"><Phone size={14}/>{c.phone}</div>
                    </td>
                    <td className="px-4 py-3">{c.cashier_code}</td>
                    <td className="px-4 py-3 text-gray-700">{c.restaurant_id}</td>
                    <td className="px-4 py-3">{renderStatusBadge(c.status)}</td>
                    <td className="px-4 py-3">{c.is_active ? <span className="text-emerald-600 font-semibold">Oui</span> : <span className="text-gray-500">Non</span>}</td>
                    <td className="px-4 py-3 text-gray-700">{c.total_orders_processed ?? 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openModal('view', c)} className="p-1 text-gray-600 hover:text-emerald-600"><Eye size={16}/></button>
                        <button onClick={() => openModal('edit', c)} className="p-1 text-gray-600 hover:text-emerald-600"><Edit size={16}/></button>
                        <button onClick={() => openModal('delete', c)} className="p-1 text-gray-600 hover:text-red-600"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span>Page {currentPage} / {totalPages} ? {totalCount} r?sultat(s)</span>
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-50">Pr?c.</button>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-50">Suiv.</button>
          </div>
          <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1">
            {[10, 20, 50].map((s) => <option key={s} value={s}>{s}/page</option>)}
          </select>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 relative">
            <button className="absolute right-4 top-4 text-gray-500" onClick={resetAndClose}>?</button>

            {modalType === 'create' && (
              <>
                <h3 className="text-xl font-semibold mb-4">Nouveau caissier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded px-3 py-2" placeholder="Pr?nom" value={createForm.first_name} onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="Nom" value={createForm.last_name} onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="Email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="T?l?phone" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="Mot de passe" type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="Restaurant ID" value={createForm.restaurant_id} onChange={(e) => setCreateForm({ ...createForm, restaurant_id: e.target.value })} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {Object.keys(createForm.permissions).map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(createForm.permissions as any)[key]}
                        onChange={(e) => setCreateForm({
                          ...createForm,
                          permissions: { ...createForm.permissions, [key]: e.target.checked },
                        })}
                      />
                      <span>{key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={resetAndClose} className="px-3 py-2 border rounded">Annuler</button>
                  <button onClick={handleCreate} disabled={saveLoading} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">{saveLoading ? 'Enregistrement...' : 'Cr?er'}</button>
                </div>
              </>
            )}

            {modalType === 'view' && selectedCashier && (
              <div className="space-y-3">
                <h3 className="text-xl font-semibold">D?tails caissier</h3>
                <p className="text-gray-700">{selectedCashier.first_name} {selectedCashier.last_name} ? {selectedCashier.cashier_code}</p>
                <p className="text-gray-700 flex items-center gap-2"><Mail size={16}/>{selectedCashier.email}</p>
                <p className="text-gray-700 flex items-center gap-2"><Phone size={16}/>{selectedCashier.phone}</p>
                <p className="text-gray-700">Restaurant: {selectedCashier.restaurant_id}</p>
                <p className="text-gray-700">Statut: {renderStatusBadge(selectedCashier.status)}</p>
                <p className="text-gray-700">Actif: {selectedCashier.is_active ? 'Oui' : 'Non'}</p>
                <p className="text-gray-700">Commandes trait?es: {selectedCashier.total_orders_processed ?? 0}</p>
                {selectedCashier.total_sales_amount && <p className="text-gray-700">Chiffre d'affaires: {selectedCashier.total_sales_amount} DA</p>}
                <p className="text-gray-700">Permissions: {selectedCashier.permissions ? Object.keys(selectedCashier.permissions).filter(k => (selectedCashier.permissions as any)[k]).join(', ') : 'N/A'}</p>
              </div>
            )}

            {modalType === 'edit' && selectedCashier && (
              <>
                <h3 className="text-xl font-semibold mb-4">Modifier caissier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border rounded px-3 py-2" placeholder="Pr?nom" value={editForm.first_name || ''} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="Nom" value={editForm.last_name || ''} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="Email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  <input className="border rounded px-3 py-2" placeholder="T?l?phone" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  <select className="border rounded px-3 py-2" value={editForm.status || 'offline'} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Actif</option>
                    <option value="on_break">En pause</option>
                    <option value="offline">Hors ligne</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} />
                    Compte actif
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {selectedCashier.permissions && Object.keys(selectedCashier.permissions).map((key) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(editForm.permissions as any)?.[key] ?? (selectedCashier.permissions as any)[key]}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          permissions: {
                            ...(editForm.permissions || selectedCashier.permissions),
                            [key]: e.target.checked,
                          },
                        })}
                      />
                      <span>{key}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={resetAndClose} className="px-3 py-2 border rounded">Annuler</button>
                  <button onClick={handleUpdate} disabled={saveLoading} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">{saveLoading ? 'Sauvegarde...' : 'Enregistrer'}</button>
                </div>
              </>
            )}

            {modalType === 'delete' && selectedCashier && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-red-600">Supprimer ce caissier ?</h3>
                <p className="text-gray-700">{selectedCashier.first_name} {selectedCashier.last_name} ? {selectedCashier.cashier_code}</p>
                <div className="flex justify-end gap-2">
                  <button onClick={resetAndClose} className="px-3 py-2 border rounded">Annuler</button>
                  <button onClick={handleDelete} disabled={saveLoading} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">{saveLoading ? 'Suppression...' : 'Supprimer'}</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
