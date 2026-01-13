'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Save,
  Edit,
  X,
  AlertCircle,
  CheckCircle,
  Shield,
  Calendar,
  RefreshCw
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AdminProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role_level: 'super_admin' | 'admin' | 'moderator';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Non authentifié. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/admin/profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement du profil');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const adminData = data.data;
        setProfile(adminData);
        setFormData({
          first_name: adminData.first_name || '',
          last_name: adminData.last_name || '',
          email: adminData.email || '',
          phone: adminData.phone || ''
        });
      } else {
        throw new Error('Format de données invalide');
      }
    } catch (err: any) {
      console.error('Erreur fetch profile:', err);
      setError(err?.message || 'Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      errors.first_name = 'Le prénom est obligatoire';
    } else if (formData.first_name.trim().length < 2) {
      errors.first_name = 'Le prénom doit contenir au moins 2 caractères';
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Le nom est obligatoire';
    } else if (formData.last_name.trim().length < 2) {
      errors.last_name = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.email.trim()) {
      errors.email = 'L\'email est obligatoire';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Format d\'email invalide';
      }
    }

    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = 'Format de téléphone invalide';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaveLoading(true);
      setError('');
      setSuccess('');

      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('Non authentifié');
      }

      // Note: Il faudrait un endpoint PUT /admin/profile/me pour mettre à jour
      // Pour l'instant, on utilise l'endpoint de mise à jour par ID si disponible
      // Sinon, on affiche juste un message
      const response = await fetch(`${API_URL}/admin/profile/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erreur lors de la mise à jour');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess('Profil mis à jour avec succès!');
        setIsEditing(false);
        await fetchProfile();
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error('Échec de la mise à jour');
      }
    } catch (err: any) {
      console.error('Erreur sauvegarde:', err);
      setError(err?.message || 'Impossible de sauvegarder');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || ''
      });
    }
    setIsEditing(false);
    setFormErrors({});
    setError('');
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      'super_admin': 'Super Administrateur',
      'admin': 'Administrateur',
      'moderator': 'Modérateur'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-blue-100 text-blue-800',
      'moderator': 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Profil non trouvé</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Impossible de charger votre profil'}</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mon Profil</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Gérez vos informations personnelles
              </p>
            </div>
            <button
              onClick={fetchProfile}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Succès</p>
                <p className="text-sm text-green-700 mt-1">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-6 py-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-white">
                <h2 className="text-2xl font-bold">
                  {profile.first_name} {profile.last_name}
                </h2>
                <p className="text-blue-100 dark:text-blue-200 mt-1">{profile.email}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(profile.role_level)}`}>
                    {getRoleLabel(profile.role_level)}
                  </span>
                  {profile.is_active ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                      Actif
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                      Inactif
                    </span>
                  )}
                </div>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2 font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>
              )}
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6">
            {isEditing ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => {
                        setFormData({ ...formData, first_name: e.target.value });
                        if (formErrors.first_name) setFormErrors({ ...formErrors, first_name: '' });
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => {
                        setFormData({ ...formData, last_name: e.target.value });
                        if (formErrors.last_name) setFormErrors({ ...formErrors, last_name: '' });
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                        }}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.email ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                        }}
                        placeholder="Optionnel"
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.phone ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {formErrors.phone && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCancel}
                    disabled={saveLoading}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saveLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saveLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Nom complet</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {profile.first_name} {profile.last_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {profile.phone || 'Non renseigné'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <Shield className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Rôle</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {getRoleLabel(profile.role_level)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Date de création</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {formatDate(profile.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Dernière mise à jour</p>
                      <p className="text-base font-semibold text-gray-900 mt-1">
                        {formatDate(profile.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

