// ====================================
// Types partagés avec le backend
// ====================================

export interface User {
  id: number;
  email: string;
  cabinetId: number;
  isPlatformAdmin?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Patient {
  id: number;
  numeroDossier: string;
  nom: string;
  prenom: string;
  dateNaissance?: string;
  sexe?: 'M' | 'F';
  gsm?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  profession?: string;
  assurance?: string;
  antecedents?: string;
  photoUrl?: string;
  reseauSocial?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientWithDetails extends Patient {
  toothStates?: ToothState[];
  appointments?: Appointment[];
  treatments?: Treatment[];
}

export interface PaginatedPatients {
  items: Patient[];
  total: number;
  page: number;
  pageCount: number;
}

export interface PatientRecall {
  id: number;
  nom: string;
  prenom: string;
  gsm?: string;
  telephoneFixe?: string;
  derniereVisite: string;
  moisEcoules: number;
}

export interface AppointmentType {
  id: number;
  libelle: string;
  dureeMinutes: number;
  couleur: string;
}

export interface Appointment {
  id: number;
  patientId: number;
  medecinId?: number;
  typeId?: number;
  dateDebut: string;
  dateFin: string;
  statut: 'planifie' | 'confirme' | 'en_cours' | 'termine' | 'annule' | 'absent';
  observation?: string;
  patient?: Pick<Patient, 'id' | 'nom' | 'prenom' | 'gsm'>;
  type?: AppointmentType;
}

export interface TreatmentAct {
  id: number;
  libelle: string;
  dents?: string;
  cout: number;
  montantRecu: number;
  remise: number;
  modeReglement?: string;
  typeSoin: 'realise' | 'a_faire' | 'devis';
}

export interface Treatment {
  id: number;
  patientId: number;
  dateSoin: string;
  observations?: string;
  acts: TreatmentAct[];
}

export interface ToothState {
  id: number;
  patientId: number;
  dentNumero: number;
  etat: ToothEtat;
  notes?: string;
  dateModif: string;
}

export type ToothEtat =
  | 'saine'
  | 'carie'
  | 'obturation'
  | 'couronne'
  | 'bridge'
  | 'implant'
  | 'extraction'
  | 'absente'
  | 'endo'
  | 'a_traiter';

export interface FinancialSummary {
  total: number;
  recu: number;
  remise: number;
  reste: number;
}

export interface Medication {
  id: number;
  nom: string;
  dosage?: string;
  forme?: string;
  posologieDefaut?: string;
}

export interface PrescriptionItem {
  id: number;
  nomMedicament: string;
  posologie: string;
  ordre: number;
}

export interface Prescription {
  id: number;
  patientId: number;
  dateEmission: string;
  texteLibre?: string;
  items: PrescriptionItem[];
}
