import { api } from './client';
import type {
  AuthResponse,
  Patient,
  PatientWithDetails,
  PaginatedPatients,
  PatientRecall,
  Appointment,
  Treatment,
  ToothState,
  FinancialSummary,
  Medication,
  Prescription,
  PrescriptionItem,
} from '@/types';

export type { Prescription, PrescriptionItem };

// ===== AUTH =====
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data),

  register: (data: {
    email: string;
    password: string;
    nom: string;
    prenom: string;
    nomCabinet: string;
  }) => api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
};

// ===== PATIENTS =====
export const patientsApi = {
  list: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<PaginatedPatients>('/patients', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<PatientWithDetails>(`/patients/${id}`).then((r) => r.data),

  create: (data: Partial<Patient>) =>
    api.post<Patient>('/patients', data).then((r) => r.data),

  update: (id: number, data: Partial<Patient>) =>
    api.patch<Patient>(`/patients/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/patients/${id}`).then((r) => r.data),

  stats: () => api.get<{ total: number; ceMois: number }>('/patients/stats').then((r) => r.data),

  recalls: (months?: number) =>
    api
      .get<PatientRecall[]>('/patients/recalls', { params: months ? { months } : undefined })
      .then((r) => r.data),
};

// ===== APPOINTMENTS =====
export const appointmentsApi = {
  list: (params?: { dateDebut?: string; dateFin?: string; patientId?: number }) =>
    api.get<Appointment[]>('/appointments', { params }).then((r) => r.data),

  today: () => api.get<Appointment[]>('/appointments/today').then((r) => r.data),

  create: (data: {
    patientId: number;
    dateDebut: string;
    dateFin: string;
    typeId?: number;
    medecinId?: number;
    observation?: string;
  }) => api.post<Appointment>('/appointments', data).then((r) => r.data),

  update: (id: number, data: Partial<Appointment>) =>
    api.patch<Appointment>(`/appointments/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/appointments/${id}`).then((r) => r.data),
};

// ===== TREATMENTS =====
export const treatmentsApi = {
  byPatient: (patientId: number) =>
    api.get<Treatment[]>(`/patients/${patientId}/treatments`).then((r) => r.data),

  create: (data: any) => api.post<Treatment>('/treatments', data).then((r) => r.data),

  financialSummary: (patientId: number) =>
    api
      .get<FinancialSummary>(`/patients/${patientId}/financial-summary`)
      .then((r) => r.data),

  toothChart: (patientId: number) =>
    api.get<ToothState[]>(`/patients/${patientId}/tooth-chart`).then((r) => r.data),

  updateTooth: (patientId: number, dentNumero: number, etat: string, notes?: string) =>
    api
      .put<ToothState>(`/patients/${patientId}/tooth-chart`, {
        dentNumero,
        etat,
        notes,
      })
      .then((r) => r.data),

  recordPayment: (
    actId: number,
    data: { montant: number; modeReglement?: string; remarque?: string },
  ) =>
    api.patch(`/treatments/acts/${actId}/payment`, data).then((r) => r.data),
};

// ===== PRESCRIPTIONS =====
export const prescriptionsApi = {
  byPatient: (patientId: number) =>
    api.get<Prescription[]>(`/patients/${patientId}/prescriptions`).then((r) => r.data),

  create: (data: {
    patientId: number;
    texteLibre?: string;
    dateEmission?: string;
    items?: { nomMedicament: string; posologie: string }[];
  }) => api.post<Prescription>('/prescriptions', { ...data, items: data.items ?? [] }).then((r) => r.data),

  medications: (search?: string) =>
    api.get<Medication[]>('/medications', { params: { search } }).then((r) => r.data),

  listModeles: () => api.get<PrescriptionModele[]>('/prescription-modeles').then((r) => r.data),

  createModele: (data: { nom: string; contenu: string }) =>
    api.post<PrescriptionModele>('/prescription-modeles', data).then((r) => r.data),

  deleteModele: (id: number) =>
    api.delete(`/prescription-modeles/${id}`).then((r) => r.data),
};

// ===== PATIENT IMAGES (photos, radios, scans) =====
export interface PatientImage {
  id: number;
  patientId: number;
  type: string;
  titre?: string | null;
  cheminFichier: string;
  tailleOctets?: string | null;
  mimeType?: string | null;
  datePrise?: string | null;
  observation?: string | null;
  uploadedById?: number | null;
  createdAt: string;
  url?: string | null;
}

export const patientImagesApi = {
  list: (patientId: number) =>
    api.get<PatientImage[]>(`/patients/${patientId}/images`).then((r) => r.data),

  upload: (
    patientId: number,
    file: File,
    data: { type: string; titre?: string; observation?: string; datePrise?: string },
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', data.type);
    if (data.titre) formData.append('titre', data.titre);
    if (data.observation) formData.append('observation', data.observation);
    if (data.datePrise) formData.append('datePrise', data.datePrise);
    return api
      .post<PatientImage>(`/patients/${patientId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  delete: (patientId: number, imageId: number) =>
    api.delete(`/patients/${patientId}/images/${imageId}`).then((r) => r.data),
};

// ===== REMINDERS (rappels manuels) =====
export interface Reminder {
  id: number;
  cabinetId: number;
  patientId: number;
  dateRappel: string;
  note?: string | null;
  termine: boolean;
  createdById?: number | null;
  createdAt: string;
  patient?: { id: number; nom: string; prenom: string; gsm?: string | null };
}

export const remindersApi = {
  listByPatient: (patientId: number) =>
    api
      .get<Reminder[]>('/reminders', { params: { patientId, includeDone: true } })
      .then((r) => r.data),

  listPending: () => api.get<Reminder[]>('/reminders').then((r) => r.data),

  create: (data: { patientId: number; dateRappel: string; note?: string }) =>
    api.post<Reminder>('/reminders', data).then((r) => r.data),

  update: (id: number, data: { termine?: boolean; dateRappel?: string; note?: string }) =>
    api.patch<Reminder>(`/reminders/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/reminders/${id}`).then((r) => r.data),
};


// ===== BILLING (abonnement, paiement Konnect) =====
export type PlanKey = 'starter' | 'pro' | 'premium';

export interface PlanDefinition {
  label: string;
  prixMillimes: number;
  maxPatients: number | null;
  maxPraticiens: number | null;
}

export interface BillingStatus {
  plan: PlanKey;
  label: string;
  statut: string;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  accesBloque: boolean;
  usage: {
    patients: { utilises: number; max: number | null };
    praticiens: { utilises: number; max: number | null };
  };
  plansDisponibles: Record<PlanKey, PlanDefinition>;
}

export const billingApi = {
  status: () => api.get<BillingStatus>('/billing/status').then((r) => r.data),

  checkout: (plan: PlanKey) =>
    api
      .post<{ payUrl: string; paymentRef: string }>('/billing/checkout', { plan })
      .then((r) => r.data),
};

export interface StatisticsOverview {
  periode: { mois: number; depuis: string };
  patients: { total: number; parMois: { mois: string; nouveaux: number }[] };
  rendezVous: {
    parMois: {
      mois: string;
      total: number;
      planifie: number;
      confirme: number;
      en_cours: number;
      termine: number;
      annule: number;
      absent: number;
    }[];
    tauxAbsence: number;
    tauxConfirmation: number;
  };
  recettes: { total: number; parMois: { mois: string; montant: number }[] };
  actesFrequents: { libelle: string; count: number }[];
}

export const statisticsApi = {
  overview: (months = 6) =>
    api.get<StatisticsOverview>(`/statistics/overview?months=${months}`).then((r) => r.data),
};

export interface PrescriptionModele {
  id: number;
  cabinetId: number;
  nom: string;
  contenu: string;
  createdById: number;
  createdAt: string;
}
