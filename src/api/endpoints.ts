import { api } from './client';
import type {
  AuthResponse,
  Patient,
  PatientWithDetails,
  PaginatedPatients,
  Appointment,
  Treatment,
  ToothState,
  FinancialSummary,
  Medication,
  Prescription,
} from '@/types';

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
    items: { nomMedicament: string; posologie: string }[];
  }) => api.post<Prescription>('/prescriptions', data).then((r) => r.data),

  medications: (search?: string) =>
    api.get<Medication[]>('/medications', { params: { search } }).then((r) => r.data),
};
