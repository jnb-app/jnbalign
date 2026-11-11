import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Lock,
  UserCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Scale,
  Sparkles,
} from 'lucide-react';

interface LegalTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'cgu' | 'privacy' | 'mentions';
}

export const LegalTermsModal: React.FC<LegalTermsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'cgu',
}) => {
  const [activeTab, setActiveTab] = useState<'cgu' | 'privacy' | 'mentions'>(defaultTab);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0A1024] light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200 light:text-slate-800 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 light:border-slate-200 bg-slate-900/50 light:bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 light:bg-amber-100 border border-amber-500/30 flex items-center justify-center text-amber-400 light:text-amber-700 shadow-inner">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="legal-modal-title" className="text-base sm:text-lg font-bold text-white light:text-slate-900 flex items-center gap-2">
                Cadre Juridique & Protection des Données
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 light:bg-emerald-100 text-emerald-400 light:text-emerald-800 border border-emerald-500/20">
                  RGPD Conforme
                </span>
              </h2>
              <p className="text-xs text-slate-400 light:text-slate-600">
                Transparence totale sur l'utilisation de JNB Align et le respect de votre vie privée
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer la fenêtre"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-1 border-b border-slate-800/60 light:border-slate-200 bg-slate-950/40 light:bg-slate-100/50 shrink-0 overflow-x-auto text-xs sm:text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('cgu')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'cgu'
                ? 'border-amber-400 text-amber-300 light:text-amber-800 bg-slate-900/80 light:bg-white shadow-xs font-semibold'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Conditions Générales (CGU)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-emerald-400 text-emerald-300 light:text-emerald-800 bg-slate-900/80 light:bg-white shadow-xs font-semibold'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Protection des Données & RGPD</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mentions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium border-b-2 transition-all cursor-pointer ${
              activeTab === 'mentions'
                ? 'border-blue-400 text-blue-300 light:text-blue-800 bg-slate-900/80 light:bg-white shadow-xs font-semibold'
                : 'border-transparent text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-blue-400" />
            <span>Mentions Légales & Propriété</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm leading-relaxed text-slate-300 light:text-slate-700">
          {/* TAB 1: CGU */}
          {activeTab === 'cgu' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Highlight Box */}
              <div className="p-4 rounded-xl bg-amber-500/10 light:bg-amber-50 border border-amber-500/20 text-amber-200 light:text-amber-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-300 light:text-amber-800 mb-1">
                    Philosophie de JNB Align : L'authenticité avant tout
                  </h4>
                  <p className="text-xs text-amber-200/90 light:text-amber-900/90 leading-normal">
                    JNB Align est une plateforme intelligente d'aide à la candidature. Elle est conçue pour valoriser votre parcours réel face aux exigences ATS (Applicant Tracking Systems), sans jamais inventer ni falsifier vos compétences.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Article 1 — Objet du Service
                </h3>
                <p>
                  Les présentes Conditions Générales d'Utilisation (CGU) encadrent l'accès et l'utilisation de l'application <strong>JNB Align</strong>. La plateforme fournit aux candidats un moteur d'analyse sémantique, une boussole de compatibilité ATS, la restructuration STAR d'expériences professionnelles, ainsi que la génération de documents professionnels prêts à l'envoi (CV optimisé et lettre de motivation sur-mesure).
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Article 2 — Responsabilité du Candidat & Véracité des Données
                </h3>
                <p className="mb-2">
                  Le candidat conserve l'entière maîtrise et la responsabilité des contenus qu'il dépose et transmet aux recruteurs :
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300 light:text-slate-600">
                  <li>
                    <strong>Vérification préalable :</strong> Le candidat s'engage à relire scrupuleusement les documents générés avant toute candidature officielle.
                  </li>
                  <li>
                    <strong>Préservation de l'authenticité :</strong> L'algorithme se base strictement sur les éléments de votre profil et s'interdit d'inventer des éléments factuels. Vous vous engagez à déclarer des faits réels (diplômes, dates, postes occupés).
                  </li>
                  <li>
                    <strong>Absence d'obligation de résultat :</strong> Les scores d'adéquation sémantique affichés dans l'application constituent des indicateurs textuels calculés sur la fiche de poste et ne constituent ni une promesse d'embauche ni une garantie de convocation en entretien, la décision finale appartenant toujours aux recruteurs.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Article 3 — Propriété des Documents Générés
                </h3>
                <p>
                  Vous demeurez <strong>le propriétaire exclusif et absolu</strong> de tous les CV, synthèses et lettres de motivation optimisés par l'application. Vous êtes libre de les exporter, modifier, imprimer ou diffuser selon votre convenance professionnelle.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Article 4 — Usage Équitable (Fair Use)
                </h3>
                <p>
                  L'accès à JNB Align est destiné à un usage individuel de recherche d'emploi ou d'orientation. Toute tentative de rétro-ingénierie, d'aspiration automatisée (scraping de masse) ou d'exploitation abusive des API d'intelligence artificielle est strictement prohibée.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRIVACY & RGPD */}
          {activeTab === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Highlight Box */}
              <div className="p-4 rounded-xl bg-emerald-500/10 light:bg-emerald-50 border border-emerald-500/20 text-emerald-200 light:text-emerald-900 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-300 light:text-emerald-800 mb-1">
                    Engagement RGPD : Zéro Revente de Données Personnelles
                  </h4>
                  <p className="text-xs text-emerald-200/90 light:text-emerald-900/90 leading-normal">
                    Vos données de candidature (coordonnées, parcours, salaires éventuels, offres convoitées) ne sont ni commercialisées, ni transmises à des tiers publicitaires. Vos fichiers restent votre propriété intégrale.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  1. Nature des Données Traitées
                </h3>
                <p className="mb-2">
                  Pour réaliser son analyse de compatibilité et générer vos documents de candidature, JNB Align traite temporairement :
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-300 light:text-slate-600">
                  <li>Le contenu textuel extrait de votre CV (formations, compétences, expériences).</li>
                  <li>Le texte ou le lien public de l'offre d'emploi ciblée.</li>
                  <li>Des données techniques anonymisées de navigation (navigateur, type d'appareil mobile/ordinateur, langue) à des fins d'amélioration de la performance logicielle.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  2. Pas d'Entraînement de Modèles IA Publics
                </h3>
                <p>
                  Les données transmises aux pipelines d'analyse sémantique sont traitées via des protocoles d'entreprise sécurisés. <strong>Aucun contenu de votre CV n'est utilisé pour entraîner ou enrichir des modèles de fondation publics tiers.</strong>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  3. Stockage Local et Droit à l'Effacement (Droit à l'Oubli)
                </h3>
                <p className="mb-2">
                  JNB Align privilégie une architecture respectueuse de votre vie privée :
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-slate-300 light:text-slate-600">
                  <li>
                    <strong>Sauvegarde locale :</strong> Vos brouillons et historiques de candidatures sont stockés en local sur votre propre navigateur (via localStorage chiffré par l'appareil).
                  </li>
                  <li>
                    <strong>Effacement instantané :</strong> Cliquez sur le bouton « Réinitialiser » ou supprimez vos candidatures depuis le tiroir « Historique » pour purger immédiatement vos informations locales.
                  </li>
                  <li>
                    Pour toute demande d'exercice de droits RGPD (accès, rectification, suppression), vous pouvez contacter le délégué à la protection des données : <code>contact@jnbalign.com</code>.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: MENTIONS LEGALES */}
          {activeTab === 'mentions' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Éditeur de l'Application
                </h3>
                <p>
                  L'application <strong>JNB Align</strong> est éditée et conçue sous la direction de :<br />
                  <strong>JNB Align Solutions</strong><br />
                  Direction de la publication : Josian Lechantre<br />
                  Contact Support & Juridique : <a href="mailto:contact@jnbalign.com" className="text-amber-400 light:text-amber-700 underline">contact@jnbalign.com</a>
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Hébergement & Sécurité des Serveurs
                </h3>
                <p>
                  La plateforme et les API d'exécution sont hébergées sur des infrastructures Cloud sécurisées haute disponibilité (Google Cloud Platform, région Europe). Les flux de données sont protégés par chiffrement SSL/TLS (HTTPS) de bout en bout.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white light:text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  Propriété Intellectuelle & Droits Réservés
                </h3>
                <p>
                  La marque <strong>JNB Align</strong>, les chartes graphiques, la conception de la Boussole d'Alignement Prisme, les structures de prompts propriétaires et les codes sources sont la propriété exclusive de leur créateur. Toute reproduction, distribution ou représentation totale ou partielle sans accord préalable écrit est formellement interdite.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 light:bg-slate-100 border border-slate-800 light:border-slate-300 text-slate-400 light:text-slate-600 text-xs">
                Dernière mise à jour des conditions : Novembre 2026. Entrée en vigueur immédiate pour tout utilisateur de l'application.
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 light:border-slate-200 bg-slate-900/60 light:bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400 light:text-slate-600 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>En utilisant JNB Align, vous bénéficiez d'une protection totale de vos données.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors shadow-sm cursor-pointer"
          >
            J'ai compris & Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
