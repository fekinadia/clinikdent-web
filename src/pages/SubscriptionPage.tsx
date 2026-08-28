import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingApi, BillingStatus, PlanKey } from '@/api/endpoints';
import { Spinner } from '@/components/ui/Spinner';
import { formatMoney, formatDate } from '@/lib/utils';

const PLAN_ORDER: PlanKey[] = ['starter', 'pro', 'premium'];

export function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const statutRedirect = searchParams.get('statut'); // 'succes' | 'echec' | null
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const { data: status, isLoading } = useQuery<BillingStatus>({
    queryKey: ['billing-status'],
    queryFn: () => billingApi.status(),
  });

  const checkoutMutation = useMutation({
    mutationFn: (plan: PlanKey) => billingApi.checkout(plan),
    onSuccess: (data) => {
      window.location.href = data.payUrl;
    },
    onError: (err: any) => {
      setLoadingPlan(null);
      toast.error(
        err?.response?.data?.message || "Impossible de générer le lien de paiement",
      );
    },
  });

  const handleChoosePlan = (plan: PlanKey) => {
    setLoadingPlan(plan);
    checkoutMutation.mutate(plan);
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="font-display text-xl font-semibold flex items-center gap-2">
          <CreditCard size={20} className="text-primary-500" />
          Abonnement
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Gérer votre plan et votre paiement (Konnect)
        </p>
      </header>

      <div className="flex-1 overflow-auto p-6 animate-fade-in space-y-6">
        {statutRedirect === 'succes' && (
          <div className="card p-4 border-emerald-200 bg-emerald-50 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              Paiement reçu. Votre abonnement sera activé dans quelques instants — actualisez la page si besoin.
            </p>
          </div>
        )}
        {statutRedirect === 'echec' && (
          <div className="card p-4 border-rose-200 bg-rose-50 flex items-center gap-3">
            <XCircle size={20} className="text-rose-600 flex-shrink-0" />
            <p className="text-sm text-rose-800">
              Le paiement n'a pas abouti. Vous pouvez réessayer ci-dessous.
            </p>
          </div>
        )}

        {isLoading || !status ? (
          <div className="card p-12">
            <Spinner />
          </div>
        ) : (
          <>
            {status.accesBloque && (
              <div className="card p-4 border-rose-200 bg-rose-50 flex items-center gap-3">
                <AlertTriangle size={20} className="text-rose-600 flex-shrink-0" />
                <p className="text-sm text-rose-800">
                  Votre accès est actuellement restreint (essai ou abonnement expiré). Choisissez un plan ci-dessous pour continuer.
                </p>
              </div>
            )}

            <div className="card p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="label">Plan actuel</div>
                  <div className="font-display text-2xl font-semibold mt-1">{status.label}</div>
                  <div className="text-sm text-slate-500 mt-1">
                    {status.statut === 'trial' && status.trialEndsAt && (
                      <>Essai gratuit jusqu'au {formatDate(status.trialEndsAt)}</>
                    )}
                    {status.statut === 'active' && status.subscriptionEndsAt && (
                      <>Renouvellement le {formatDate(status.subscriptionEndsAt)}</>
                    )}
                    {status.statut !== 'trial' && status.statut !== 'active' && (
                      <>Statut : {status.statut}</>
                    )}
                  </div>
                </div>
                <span className={`badge ${status.accesBloque ? 'badge-danger' : 'badge-success'}`}>
                  {status.accesBloque ? 'Accès restreint' : 'Actif'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-6">
                <UsageBar
                  label="Patients"
                  utilises={status.usage.patients.utilises}
                  max={status.usage.patients.max}
                />
                <UsageBar
                  label="Praticiens"
                  utilises={status.usage.praticiens.utilises}
                  max={status.usage.praticiens.max}
                />
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Choisir un plan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLAN_ORDER.map((planKey) => {
                  const plan = status.plansDisponibles[planKey];
                  if (!plan) return null;
                  const isCurrent = status.plan === planKey;
                  return (
                    <div
                      key={planKey}
                      className={`card p-6 flex flex-col ${
                        isCurrent ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-200'
                      }`}
                    >
                      <div className="font-display text-lg font-semibold">{plan.label}</div>
                      <div className="mt-2 mb-4">
                        <span className="text-2xl font-semibold">
                          {formatMoney(plan.prixMillimes / 1000)}
                        </span>
                        <span className="text-sm text-slate-400"> DT/mois</span>
                      </div>
                      <ul className="text-sm text-slate-600 space-y-1.5 flex-1">
                        <li>
                          {plan.maxPatients === null
                            ? 'Patients illimités'
                            : `Jusqu'à ${plan.maxPatients} patients`}
                        </li>
                        <li>
                          {plan.maxPraticiens === null
                            ? 'Praticiens illimités'
                            : `${plan.maxPraticiens} praticien${plan.maxPraticiens > 1 ? 's' : ''}`}
                        </li>
                      </ul>
                      <button
                        onClick={() => handleChoosePlan(planKey)}
                        disabled={isCurrent || checkoutMutation.isPending}
                        className={`mt-5 px-4 py-2.5 rounded-lg font-medium transition text-sm disabled:opacity-50 ${
                          isCurrent ? 'bg-slate-100 text-slate-400' : 'text-white'
                        }`}
                        style={isCurrent ? undefined : { backgroundColor: '#0e6ba8' }}
                      >
                        {isCurrent
                          ? 'Plan actuel'
                          : checkoutMutation.isPending && loadingPlan === planKey
                            ? 'Redirection...'
                            : 'Payer avec Konnect'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Le paiement est traité par Konnect. Vous serez redirigé(e) vers une page de
                paiement sécurisée, puis renvoyé(e) ici une fois le paiement effectué.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function UsageBar({
  label,
  utilises,
  max,
}: {
  label: string;
  utilises: number;
  max: number | null;
}) {
  const pct = max ? Math.min(100, (utilises / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span>{max === null ? `${utilises} (illimité)` : `${utilises} / ${max}`}</span>
      </div>
      {max !== null && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
