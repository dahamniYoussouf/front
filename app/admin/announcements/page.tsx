'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Edit,
  Trash2,
  Eye,
  Plus,
  Calendar,
  AlertCircle,
  Code,
  Palette,
  FileText,
  X,
  Check,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ==== TYPES ====

type AnnouncementType = 'info' | 'success' | 'warning' | 'error';

interface Announcement {
  id: string;
  title: string;
  content: string;
  css_styles?: string;
  js_scripts?: string;
  type: AnnouncementType;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

type ModalType = '' | 'view' | 'edit' | 'create' | 'delete' | 'preview';

type BuilderTab = 'content' | 'css' | 'javascript';

export default function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | AnnouncementType>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<ModalType>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  
  // Builder state
  const [builderTab, setBuilderTab] = useState<BuilderTab>('content');
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    css_styles: '',
    js_scripts: '',
    type: 'info',
    is_active: true,
    start_date: '',
    end_date: ''
  });

  // Fetch announcements
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/announcement/getall`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des annonces');
      }

      const data = await response.json();

      if (data.success && data.data) {
        setAnnouncements(data.data as Announcement[]);
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch announcements:', err);
      setError(err?.message || 'Impossible de charger les annonces');
    } finally {
      setLoading(false);
    }
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter((announcement) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      announcement.title?.toLowerCase().includes(search) ||
      announcement.content?.toLowerCase().includes(search);

    const matchesType =
      filterType === 'all' || announcement.type === filterType;

    const matchesActive =
      filterActive === 'all' ||
      (filterActive === 'active' && announcement.is_active) ||
      (filterActive === 'inactive' && !announcement.is_active);

    return matchesSearch && matchesType && matchesActive;
  });

  // Handle actions
  const handleAction = (announcement: Announcement | null, type: ModalType) => {
    setSelectedAnnouncement(announcement);

    if (type === 'create') {
      setFormData({
        title: '',
        content: '',
        css_styles: '',
        js_scripts: '',
        type: 'info',
        is_active: true,
        start_date: '',
        end_date: ''
      });
    } else if (type === 'edit' && announcement) {
      setFormData({
        title: announcement.title,
        content: announcement.content,
        css_styles: announcement.css_styles || '',
        js_scripts: announcement.js_scripts || '',
        type: announcement.type,
        is_active: announcement.is_active,
        start_date: announcement.start_date ? announcement.start_date.split('T')[0] : '',
        end_date: announcement.end_date ? announcement.end_date.split('T')[0] : ''
      });
    }

    setModalType(type);
    setShowModal(true);
    setBuilderTab('content');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAnnouncement(null);
    setModalType('');
    setFormData({
      title: '',
      content: '',
      css_styles: '',
      js_scripts: '',
      type: 'info',
      is_active: true,
      start_date: '',
      end_date: ''
    });
    setSaveLoading(false);
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Validation
      if (!formData.title?.trim()) {
        throw new Error('Le titre est requis');
      }
      if (!formData.content?.trim()) {
        throw new Error('Le contenu est requis');
      }

      const payload = {
        title: formData.title,
        content: formData.content,
        css_styles: formData.css_styles || '',
        js_scripts: formData.js_scripts || '',
        type: formData.type,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      let response;
      if (modalType === 'create') {
        response = await fetch(`${API_URL}/announcement/create`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else if (modalType === 'edit' && selectedAnnouncement) {
        response = await fetch(`${API_URL}/announcement/update/${selectedAnnouncement.id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } else {
        throw new Error('Action invalide');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la sauvegarde');
      }

      const data = await response.json();

      if (data.success) {
        await fetchAnnouncements();
        handleCloseModal();
      } else {
        throw new Error('Échec de la sauvegarde');
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err?.message || 'Impossible de sauvegarder');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) {
      setError('Aucune annonce sélectionnée');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      const response = await fetch(`${API_URL}/announcement/delete/${selectedAnnouncement.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la suppression');
      }

      const data = await response.json();

      if (data.success) {
        await fetchAnnouncements();
        handleCloseModal();
      } else {
        throw new Error('Échec de la suppression');
      }
    } catch (err: any) {
      console.error('Erreur suppression:', err);
      setError(err?.message || 'Impossible de supprimer');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInputChange = (field: keyof Announcement, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTypeIcon = (type: AnnouncementType) => {
    switch (type) {
      case 'info':
        return <Info className="w-4 h-4" />;
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: AnnouncementType) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des Annonces</h1>
              <p className="mt-1 text-sm text-gray-500">
                {filteredAnnouncements.length} annonce
                {filteredAnnouncements.length > 1 ? 's' : ''} trouvée
                {filteredAnnouncements.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchAnnouncements}
                disabled={loading}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Chargement...' : 'Actualiser'}
              </button>
              <button
                onClick={() => handleAction(null, 'create')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nouvelle Annonce
              </button>
            </div>
          </div>

          {/* Message d'erreur global */}
          {error && !showModal && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Barre de recherche et filtres */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par titre ou contenu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les types</option>
              <option value="info">Info</option>
              <option value="success">Succès</option>
              <option value="warning">Attention</option>
              <option value="error">Erreur</option>
            </select>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as typeof filterActive)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Annonce
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Période
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Création
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {announcement.title}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {announcement.content.replace(/<[^>]*>/g, '')}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(announcement.type)}`}>
                          {getTypeIcon(announcement.type)}
                          <span className="ml-1 capitalize">{announcement.type}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {announcement.start_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{formatDate(announcement.start_date)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Aucune date</span>
                          )}
                          {announcement.end_date && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <span>→ {formatDate(announcement.end_date)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            announcement.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {announcement.is_active ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(announcement.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleAction(announcement, 'view')}
                            className="text-gray-600 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(announcement, 'edit')}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAction(announcement, 'delete')}
                            className="text-red-600 hover:text-red-900 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAnnouncements.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900">
                  Aucune annonce trouvée
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Essayez de modifier vos critères de recherche ou créez une nouvelle annonce
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {modalType === 'view' && 'Détails de l\'Annonce'}
                {modalType === 'edit' && 'Modifier l\'Annonce'}
                {modalType === 'create' && 'Nouvelle Annonce'}
                {modalType === 'delete' && 'Confirmer la Suppression'}
                {modalType === 'preview' && 'Aperçu de l\'Annonce'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              {/* Error message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Erreur</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {modalType === 'delete' ? (
                <div className="text-center py-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Êtes-vous sûr de vouloir supprimer cette annonce ?
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    <strong>{selectedAnnouncement?.title}</strong>
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Cette action est irréversible.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleCloseModal}
                      disabled={saveLoading}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={saveLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saveLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Suppression...
                        </>
                      ) : (
                        'Supprimer'
                      )}
                    </button>
                  </div>
                </div>
              ) : modalType === 'view' && selectedAnnouncement ? (
                <div className="space-y-6">
                  {/* Title and Type */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedAnnouncement.title}
                      </h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTypeBadgeColor(selectedAnnouncement.type)}`}>
                        {getTypeIcon(selectedAnnouncement.type)}
                        <span className="ml-1 capitalize">{selectedAnnouncement.type}</span>
                      </span>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contenu
                    </label>
                    <div 
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de début
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedAnnouncement.start_date ? formatDate(selectedAnnouncement.start_date) : 'Non définie'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de fin
                      </label>
                      <p className="text-sm text-gray-900">
                        {selectedAnnouncement.end_date ? formatDate(selectedAnnouncement.end_date) : 'Non définie'}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statut
                    </label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedAnnouncement.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedAnnouncement.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Custom Styles */}
                  {(selectedAnnouncement.css_styles || selectedAnnouncement.js_scripts) && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Personnalisation</h4>
                      {selectedAnnouncement.css_styles && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Palette className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">CSS personnalisé</span>
                          </div>
                          <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                            {selectedAnnouncement.css_styles}
                          </pre>
                        </div>
                      )}
                      {selectedAnnouncement.js_scripts && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Code className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">JavaScript</span>
                          </div>
                          <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">
                            {selectedAnnouncement.js_scripts}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (modalType === 'edit' || modalType === 'create') ? (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title || ''}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Titre de l'annonce"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.type || 'info'}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="info">Info</option>
                          <option value="success">Succès</option>
                          <option value="warning">Attention</option>
                          <option value="error">Erreur</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Statut
                        </label>
                        <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!formData.is_active}
                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">Annonce active</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de début
                        </label>
                        <input
                          type="date"
                          value={formData.start_date || ''}
                          onChange={(e) => handleInputChange('start_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date de fin 
                        </label>
                        <input
                          type="date"
                          value={formData.end_date || ''}
                          onChange={(e) => handleInputChange('end_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Builder Tabs */}
                  <div>
                    <div className="flex border-b border-gray-200 mb-4">
                      <button
                        onClick={() => setBuilderTab('content')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          builderTab === 'content'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <FileText className="w-4 h-4 inline-block mr-2" />
                        Contenu
                      </button>
                      <button
                        onClick={() => setBuilderTab('css')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          builderTab === 'css'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Palette className="w-4 h-4 inline-block mr-2" />
                        CSS
                      </button>
                      <button
                        onClick={() => setBuilderTab('javascript')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          builderTab === 'javascript'
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Code className="w-4 h-4 inline-block mr-2" />
                        JavaScript
                      </button>
                    </div>

                    {/* Tab Content */}
                    {builderTab === 'content' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contenu HTML <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.content || ''}
                          onChange={(e) => handleInputChange('content', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={12}
                          placeholder="<div>Votre contenu HTML ici...</div>"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Vous pouvez utiliser du HTML pour formater votre annonce
                        </p>
                      </div>
                    )}

                    {builderTab === 'css' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Styles CSS personnalisés (optionnel)
                        </label>
                        <textarea
                          value={formData.css_styles || ''}
                          onChange={(e) => handleInputChange('css_styles', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={12}
                          placeholder=".announcement { color: #333; }"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Ajoutez vos styles CSS personnalisés (sans balise &lt;style&gt;)
                        </p>
                      </div>
                    )}

                    {builderTab === 'javascript' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          JavaScript personnalisé (optionnel)
                        </label>
                        <textarea
                          value={formData.js_scripts || ''}
                          onChange={(e) => handleInputChange('js_scripts', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                          rows={12}
                          placeholder="console.log('Hello');"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          Ajoutez votre code JavaScript (sans balise &lt;script&gt;)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aperçu
                    </label>
                    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 min-h-[100px]">
                      {formData.content ? (
                        <div dangerouslySetInnerHTML={{ __html: formData.content }} />
                      ) : (
                        <p className="text-gray-400 text-sm italic">L'aperçu apparaîtra ici...</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            {modalType !== 'delete' && modalType !== 'view' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saveLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {modalType === 'create' ? 'Créer' : 'Enregistrer'}
                    </>
                  )}
                </button>
              </div>
            )}

            {modalType === 'view' && (
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}