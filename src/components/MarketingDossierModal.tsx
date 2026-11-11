import React, { useState } from 'react';
import {
  FileText,
  Printer,
  X,
  Compass,
  CheckCircle2,
  Calendar,
  Sparkles,
  Share2,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Target,
  Copy,
  Check,
  Palette,
  Layers,
  MessageSquare,
  BarChart3,
} from 'lucide-react';

interface MarketingDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MarketingDossierModal: React.FC<MarketingDossierModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('intro');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-5xl h-[94vh] bg-[#0A1024] light:bg-white border border-amber-400/30 light:border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 light:text-slate-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 light:bg-amber-100 border border-amber-500/30 flex items-center justify-center text-amber-400 light:text-amber-700 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="dossier-title" className="text-base sm:text-lg font-bold text-white light:text-slate-900 flex items-center gap-2">
                Dossier Marketing, Communication & Plan de Lancement JNB Align
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 light:bg-amber-100 text-amber-300 light:text-amber-800 border border-amber-500/20">
                  Édition Complète
                </span>
              </h2>
              <p className="text-xs text-slate-400 light:text-slate-600">
                Guide opérationnel officiel • Lancement à J-7 jusqu'à J+30
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 light:bg-slate-200 light:hover:bg-slate-300 text-slate-200 light:text-slate-800 transition-colors cursor-pointer border border-slate-700 light:border-slate-300"
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-slate-800 light:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              aria-label="Fermer le dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-Pane Body: Sidebar Nav + Formatted Article Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Quick Nav Sidebar */}
          <div className="w-64 border-r border-slate-800 light:border-slate-200 bg-slate-950/40 light:bg-slate-50/60 p-4 overflow-y-auto hidden md:block shrink-0 text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 light:text-slate-400 px-2 tracking-wider block mb-2">
              Sommaire Rapide
            </span>
            {[
              { id: 'intro', label: '1. Diagnostic & Proposition UVP' },
              { id: 'features', label: '2. Fonctionnalités Clés & Atouts' },
              { id: 'concurrence', label: '3. Différence Face à la Concurrence' },
              { id: 'ligne', label: '4. Ligne Éditoriale & Psychologie' },
              { id: 'da', label: '5. Direction Artistique & Couleurs' },
              { id: 'canaux', label: '6. Cartographie des Canaux' },
              { id: 'reseaux', label: '7. Création des Comptes Réseaux' },
              { id: 'planning', label: '8. Rétroplanning J-7 à Jour J' },
              { id: 'post', label: '9. Stratégie Post-Lancement' },
              { id: 'kpis', label: '10. Métriques & KPIs Clés' },
            ].map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => {
                  setActiveSection(sec.id);
                  const el = document.getElementById(`doc-sec-${sec.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-between ${
                  activeSection === sec.id
                    ? 'bg-amber-400/15 text-amber-300 light:text-amber-900 font-bold border border-amber-400/30'
                    : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-slate-900 light:hover:bg-slate-200'
                }`}
              >
                <span className="truncate">{sec.label}</span>
              </button>
            ))}
          </div>

          {/* Formatted Text Content */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-10 leading-relaxed text-slate-200 light:text-slate-800 text-sm">
            {/* Header Title Box */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-blue-900/10 to-transparent border border-amber-400/20 text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 uppercase tracking-widest shadow-sm">
                Document Stratégique Officiel
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-white light:text-slate-950">
                STRATÉGIE MARKETING, COMMUNICATION & PLAN DE LANCEMENT
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 light:text-slate-600 max-w-2xl mx-auto">
                Comment positionner, faire briller et lancer avec succès <strong>JNB Align</strong> face aux parseurs ATS et aux concurrents du marché.
              </p>
            </div>

            {/* SECTION 1 */}
            <div id="doc-sec-intro" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <Target className="w-5 h-5" />
                <h3>1. Diagnostic & Proposition de Valeur Unique (UVP)</h3>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-2">
                <p className="font-semibold text-rose-400 light:text-rose-700">Le problème critique du marché :</p>
                <p>
                  <strong>75 % des CV sont rejetés par les robots ATS</strong> (Workday, Taleo, Greenhouse, Lever, iCIMS) sans jamais avoir été lus par un humain. Les modèles Canva créent des colonnes illisibles pour les robots, et ChatGPT brut génère des formulations artificielles et des compétences inventées démasquées en 3 secondes par les recruteurs.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 light:bg-amber-50 border border-amber-400/30 text-amber-200 light:text-amber-900">
                <p className="font-bold text-xs uppercase tracking-wider mb-1 text-amber-400 light:text-amber-800">
                  La Proposition de Valeur Unique (La phrase qui tue) :
                </p>
                <blockquote className="text-base font-semibold italic text-white light:text-slate-950">
                  « Déjouez les filtres robots sans jamais travestir votre parcours : générez en 10 secondes un CV certifié ATS à 95 % d'impact STAR et une lettre de motivation stratégique taillée pour convaincre le décideur humain. »
                </blockquote>
              </div>
            </div>

            {/* SECTION 2 */}
            <div id="doc-sec-features" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <Sparkles className="w-5 h-5" />
                <h3>2. Les Fonctionnalités Clés qui Créent l'Adoption</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <h4 className="font-bold text-white light:text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Triple Ingestion Universelle
                  </h4>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    Dépose de PDF/Word, copier-coller libre, et surtout <strong>l'import direct par URL d'offre</strong> (LinkedIn, HelloWork, France Travail). Plus besoin de télécharger l'offre d'emploi.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <h4 className="font-bold text-white light:text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Charte d'Authenticité & Vérité des Faits
                  </h4>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    L'IA chiffre et restructure avec la méthode STAR vos réussites réelles, mais n'invente jamais d'employeurs ou de compétences fictives. Sérénité garantie en entretien.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <h4 className="font-bold text-white light:text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Pack 2 Documents Synchronisés
                  </h4>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    Génération conjointe du CV certifié ATS et de la lettre de motivation stratégique construite sur le modèle influent <em>« Vous / Moi / Nous »</em>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                  <h4 className="font-bold text-white light:text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    Boussole Prismatique & Radiographie X-Ray
                  </h4>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    Jauge interactive Avant / Après (+35 pts ATS en moyenne), cartographie des lacunes sémantiques et vue transparente de ce que le robot ATS extrait.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3 */}
            <div id="doc-sec-concurrence" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <TrendingUp className="w-5 h-5" />
                <h3>3. Matrice de Différenciation Face à la Concurrence</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-800 light:border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-900 light:bg-slate-100 text-slate-300 light:text-slate-700 uppercase font-bold">
                    <tr>
                      <th className="p-3">Solution</th>
                      <th className="p-3">Leur Faiblesse Majeure</th>
                      <th className="p-3">La Réponse Supérieure JNB Align</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 light:divide-slate-200">
                    <tr className="bg-amber-500/5">
                      <td className="p-3 font-bold text-amber-300 light:text-amber-800">JNB ALIGN</td>
                      <td className="p-3 text-emerald-400">Aucune concession</td>
                      <td className="p-3 font-semibold text-white light:text-slate-900">
                        Dédié Parsing ATS + Décideur Humain • Pack 2 docs synchronisés • Faits 100% authentiques • Bilingue FR/EN
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Modèles Canva</td>
                      <td className="p-3 text-rose-400">Rejetés à 80% par Workday (colonnes corrompues)</td>
                      <td className="p-3">Structure monocolonne d'élite conçue pour optimiser le parsing ATS.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">ChatGPT / Claude brut</td>
                      <td className="p-3 text-rose-400">Inventions, style convenu, ne connaît pas les règles ATS</td>
                      <td className="p-3">Algorithme propriétaire STAR et extraction sémantique mot-à-mot.</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold">Teal / Jobscan (USA)</td>
                      <td className="p-3 text-rose-400">Français approximatif, paywalls très chers, pas de lettre</td>
                      <td className="p-3">Conçu nativement pour le marché français et international.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4 : LIGNE ÉDITORIALE & PSYCHOLOGIE */}
            <div id="doc-sec-ligne" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <MessageSquare className="w-5 h-5" />
                <h3>4. Ligne Éditoriale, Psychologie & Piliers de Message</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-2">
                  <h4 className="font-bold text-white light:text-slate-900 text-xs uppercase tracking-wider">
                    4.1 Ton de Voix (Tone of Voice)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                      <strong className="text-amber-300 light:text-amber-800 block mb-1">🛡️ L'Allié Protecteur</strong>
                      <span>Bienveillant mais percutant. On ne culpabilise jamais le candidat ; on désigne le vrai coupable : le tri opaque des ATS.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                      <strong className="text-blue-400 block mb-1">🔬 Expert & Scientifique</strong>
                      <span>Vocabulaire précis (<em>réfraction sémantique, méthode STAR, Workday parser, cartographie des lacunes</em>) sans être pédant.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                      <strong className="text-emerald-400 block mb-1">🎯 Orienté Succès</strong>
                      <span>Dynamique, responsabilisant, apportant des victoires immédiates et des scores concrets (+35 pts).</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-2">
                  <h4 className="font-bold text-white light:text-slate-900 text-xs uppercase tracking-wider">
                    4.2 Les 4 Piliers Thématiques de Communication
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                      <strong className="text-rose-400 block mb-1">Pilier 1 : La Vérité Dérangeante (Choc)</strong>
                      <span>Pourquoi vous ne recevez jamais de réponse malgré un profil parfait ? Ce n'est pas votre talent : c'est le robot qui lit mal votre CV.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                      <strong className="text-emerald-400 block mb-1">Pilier 2 : Le Combat Anti-Hallucination</strong>
                      <span>L'IA ne doit pas mentir à votre place. JNB Align sublime vos vraies victoires avec la méthodologie STAR, sans inventer une ligne.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                      <strong className="text-cyan-400 block mb-1">Pilier 3 : La Démonstration Produit (Whaouh)</strong>
                      <span>Importez l'URL d'une offre d'emploi, observez la boussole s'aligner et le score passer de 48% à 94% en 10 secondes.</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                      <strong className="text-amber-400 block mb-1">Pilier 4 : La Victoire du Candidat</strong>
                      <span>De la candidature bloquée à l'entretien réussi grâce aux 3 questions déduites par notre coach intégré.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5 : DIRECTION ARTISTIQUE & COULEURS */}
            <div id="doc-sec-da" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <Palette className="w-5 h-5" />
                <h3>5. Direction Artistique, Identité Visuelle & Composition</h3>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 light:text-slate-600">
                  JNB Align évoque <strong>la haute technologie, la sérénité et le statut exécutif</strong> (luxe discret et ingénierie d'élite).
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-[#060B18] border border-slate-700 text-white space-y-1">
                    <div className="w-6 h-6 rounded-full bg-[#060B18] border border-slate-500 shadow-sm" />
                    <strong className="block text-[11px]">Bleu Nuit Spatial</strong>
                    <span className="text-[10px] text-slate-400 block">#060B18</span>
                    <span className="text-[9px] text-slate-500">Rigueur & Sécurité</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-[#F59E0B] shadow-sm shadow-amber-500/50" />
                    <strong className="block text-[11px] text-amber-400">Or Impérial</strong>
                    <span className="text-[10px] text-amber-200/80 block">#F59E0B</span>
                    <span className="text-[9px] text-amber-300/70">Triomphe & Réussite</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-[#10B981] shadow-sm shadow-emerald-500/50" />
                    <strong className="block text-[11px] text-emerald-400">Vert Émeraude</strong>
                    <span className="text-[10px] text-emerald-200/80 block">#10B981</span>
                    <span className="text-[9px] text-emerald-300/70">Validation ATS</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-300 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-[#38BDF8] shadow-sm shadow-cyan-500/50" />
                    <strong className="block text-[11px] text-cyan-400">Cyan Laser</strong>
                    <span className="text-[10px] text-cyan-200/80 block">#38BDF8</span>
                    <span className="text-[9px] text-cyan-300/70">Rayon & Vision</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-slate-900 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-white border border-slate-400 shadow-sm" />
                    <strong className="block text-[11px] text-slate-900">Blanc Pur & Titane</strong>
                    <span className="text-[10px] text-slate-600 block">#FFFFFF</span>
                    <span className="text-[9px] text-slate-500">Lisibilité A4</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200 text-xs space-y-1">
                  <strong className="text-white light:text-slate-900">Ambiance Visuelle des Médias :</strong>
                  <p className="text-slate-400 light:text-slate-600">
                    Dégradés radiaux dorés sur fond sombre, feuilles de CV A4 immaculées et ultra-nettes, portraits de candidats confiants en posture naturelle (sans images banques d'images clichées).
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 6 : CARTOGRAPHIE DES CANAUX */}
            <div id="doc-sec-canaux" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <Layers className="w-5 h-5" />
                <h3>6. Cartographie des Canaux & Formats de Contenus</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-800 light:border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-900 light:bg-slate-100 text-slate-300 light:text-slate-700 uppercase font-bold">
                    <tr>
                      <th className="p-3">Canal</th>
                      <th className="p-3">Rôle Stratégique</th>
                      <th className="p-3">Formats Clés à Produire</th>
                      <th className="p-3">Fréquence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 light:divide-slate-200 text-slate-300 light:text-slate-700">
                    <tr>
                      <td className="p-3 font-bold text-blue-400">LinkedIn (Canal n°1 ROI)</td>
                      <td className="p-3">Cible cadres, RH, managers et freelances en veille.</td>
                      <td className="p-3">Carrousels PDF éducatifs, storytelling « Avant/Après », vidéos screencast 45s.</td>
                      <td className="p-3 font-semibold text-amber-400">1 post / jour</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-cyan-400">TikTok & Reels</td>
                      <td className="p-3">Viralité auprès des jeunes diplômés et reconversions.</td>
                      <td className="p-3">Vidéos courtes verticales 9:16 : « Pourquoi votre CV est rejeté en 3s », tests d'offres live.</td>
                      <td className="p-3 font-semibold text-amber-400">1 à 2 / jour</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-red-400">YouTube & Shorts</td>
                      <td className="p-3">Référencement durable (SEO), tutoriels pas-à-pas.</td>
                      <td className="p-3">1 masterclass complète (8-10 min) + déclinaisons Shorts des passages clés.</td>
                      <td className="p-3 font-semibold text-amber-400">1 vidéo + Shorts</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-purple-400">Communautés</td>
                      <td className="p-3">Acquisition directe et ultra-qualifiée.</td>
                      <td className="p-3">Reddit (r/emploi, r/france), Discord Tech, groupes alumni écoles.</td>
                      <td className="p-3 font-semibold text-amber-400">Entraide continue</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-emerald-400">Partage In-App</td>
                      <td className="p-3">Recommandation virale entre candidats.</td>
                      <td className="p-3">Modale de partage intégrée (WhatsApp, LinkedIn, Email) dès le pack téléchargé.</td>
                      <td className="p-3 font-semibold text-amber-400">Automatique</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 7 : RESEAUX SOCIAUX */}
            <div id="doc-sec-reseaux" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <Share2 className="w-5 h-5" />
                <h3>7. Stratégie Réseaux Sociaux : Comptes Personnels vs Comptes Dédiés</h3>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/60 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-3">
                <h4 className="font-bold text-white light:text-slate-900">Le Choix Stratégique : Modèle « Founder-Led Growth »</h4>
                <p>
                  En 2026, les algorithmes (notamment LinkedIn) divisent par 5 à 10 la portée des logos de marque. Les candidats veulent voir l'humain derrière l'outil.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                    <strong className="text-blue-400 block mb-1">LinkedIn :</strong>
                    Publiez à 80% sur votre <strong>Profil Personnel (Josian Lechantre)</strong> en storytelling fondateur. Créez la <strong>Page Entreprise JNB Align</strong> comme ancrage officiel et pour afficher le logo sur votre profil.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                    <strong className="text-cyan-400 block mb-1">TikTok :</strong>
                    Créez le compte dédié <strong>@jnbalign</strong>. L'algorithme classe par thématique (#CV #Emploi). Tournez les vidéos facecam ou screencast en incarnant vous-même la marque.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                    <strong className="text-pink-400 block mb-1">Instagram :</strong>
                    Compte pro dédié <strong>@jnbalign</strong> avec les 5 Stories à la une (La Boussole, STAR, Avis, Tuto URL, RGPD). Relais en bio sur votre compte perso.
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950 light:bg-white border border-slate-800 light:border-slate-200">
                    <strong className="text-red-400 block mb-1">YouTube :</strong>
                    Chaîne officielle <strong>JNB Align</strong> pour la vidéo démo 2 min et Shorts réutilisant les formats TikTok.
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 8 : PLANNING J-7 */}
            <div id="doc-sec-planning" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <Calendar className="w-5 h-5" />
                <h3>8. Le Plan de Communication Détaillé « Lancement en 7 Jours »</h3>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300 light:text-amber-800 mb-1">
                    <span>JOUR J-7 : La Révélation du Trou Noir des Candidatures</span>
                    <span className="font-mono bg-amber-400/20 px-2 py-0.5 rounded">LinkedIn + TikTok</span>
                  </div>
                  <p className="text-xs text-slate-300 light:text-slate-600">
                    <strong>Accroche :</strong> « Vous avez envoyé 40 CV ce mois-ci et reçu 38 rejets automatiques à 3h du matin ? Ce n'est pas un recruteur : c'est un automate ATS (Workday) qui n'a même pas réussi à lire vos compétences à cause de la mise en page. Dans 7 jours, nous mettons fin à cette injustice. »
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300 light:text-emerald-800 mb-1">
                    <span>JOUR J-6 : Le Manifeste « Zéro Hallucination »</span>
                    <span className="font-mono bg-emerald-400/20 px-2 py-0.5 rounded">Carrousel 5 Slides</span>
                  </div>
                  <p className="text-xs text-slate-300 light:text-slate-600">
                    Pourquoi utiliser ChatGPT brut pour son CV est une bombe à retardement en entretien. La philosophie JNB Align : valoriser vos vraies réalisations avec la méthode STAR sans jamais mentir.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-300 light:text-cyan-800 mb-1">
                    <span>JOUR J-5 : La Démonstration Vidéo 45 Secondes</span>
                    <span className="font-mono bg-cyan-400/20 px-2 py-0.5 rounded">Vidéo Screencast</span>
                  </div>
                  <p className="text-xs text-slate-300 light:text-slate-600">
                    Dépôt du CV + lien de l'offre. Clic sur « Optimiser ». La boussole s'anime, le score bondit de 48% à 94%. Téléchargement du pack CV + Lettre en 1 clic.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-300 light:text-rose-800 mb-1">
                    <span>JOUR J-4 : Le Duel Impitoyable : CV Canva vs CV Certifié ATS</span>
                    <span className="font-mono bg-rose-400/20 px-2 py-0.5 rounded">PDF LinkedIn</span>
                  </div>
                  <p className="text-xs text-slate-300 light:text-slate-600">
                    Anatomie d'un CV Canva vu par le robot Workday : icônes corrompues, colonnes croisées. Comment JNB Align maximise le score d'adéquation sans sacrifier la lisibilité.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-300 light:text-purple-800 mb-1">
                    <span>JOUR J-3 : L'Innovation de l'Import par URL (Praticité Mobile)</span>
                    <span className="font-mono bg-purple-400/20 px-2 py-0.5 rounded">TikTok / Reels</span>
                  </div>
                  <p className="text-xs text-slate-300 light:text-slate-600">
                    Dans le métro, vous tombez sur une offre de rêve sur LinkedIn. Copiez le lien, JNB Align extrait tout et adapte votre CV avant votre station d'arrivée.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-300 light:text-blue-800 mb-1">
                    <span>JOUR J-2 : Le Coach Pré-Entretien Oral (Méthode STAR)</span>
                    <span className="font-mono bg-blue-400/20 px-2 py-0.5 rounded">Post d'expertise RH</span>
                  </div>
                  <p className="text-xs text-slate-300 light:text-slate-600">
                    Passer l'ATS n'est que la 1ère étape. Présentation du coach oral intégré qui déduit les 3 questions pièges de l'offre avec vos arguments prêts.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-300 light:text-amber-800 mb-1">
                    <span>JOUR J-1 : Compte à Rebours & Liste VIP</span>
                    <span className="font-mono bg-amber-400/20 px-2 py-0.5 rounded">Teasing Stories</span>
                  </div>
                  <p className="text-xs text-slate-300 light:text-slate-600">
                    « Demain à 9h00 : ouverture officielle de JNB Align en accès libre. Préparez votre CV actuel : demain, votre recherche d'emploi change d'ère. »
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/40">
                  <div className="flex items-center justify-between text-sm font-extrabold text-white light:text-slate-950 mb-1">
                    <span>🚀 JOUR J : LE GRAND LANCEMENT PUBLIC</span>
                    <span className="font-mono bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-xs">Jour J 09h00</span>
                  </div>
                  <p className="text-xs text-slate-200 light:text-slate-700 leading-normal">
                    Publication du post majeur sur LinkedIn personnel + relais vidéo TikTok. Réponse sous 10 minutes à chaque commentaire pour alimenter la viralité de l'algorithme.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 9 : POST-LANCEMENT & CROISSANCE */}
            <div id="doc-sec-post" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                <h3>9. Stratégie Post-Lancement & Leviers de Croissance (J+1 à J+30)</h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                    <strong className="text-amber-300 light:text-amber-800 block">9.1 Le Moteur Viral In-App</strong>
                    <p className="text-slate-400 light:text-slate-600">
                      Dès qu'un candidat télécharge son pack complet, une fenêtre élégante lui propose de recommander l'outil à un collègue en transition avec partage natif 1-clic.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                    <strong className="text-blue-400 block">9.2 Les « CV Teardown » Hebdomadaires</strong>
                    <p className="text-slate-400 light:text-slate-600">
                      Chaque mardi sur LinkedIn/TikTok : analyse publique d'un CV anonymisé (score 44% ➡️ passage dans JNB Align ➡️ score 92% et retours recruteurs).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                    <strong className="text-emerald-400 block">9.3 Partenariats Écoles & Outplacement</strong>
                    <p className="text-slate-400 light:text-slate-600">
                      Proposer JNB Align aux responsables carrières d'écoles et aux coachs de transition professionnelle comme laboratoire de calibration technique.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/50 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-1">
                    <strong className="text-purple-400 block">9.4 Évolutions Produits Clés</strong>
                    <p className="text-slate-400 light:text-slate-600">
                      Simulateur audio du pitch des 2 premières minutes d'entretien et extension Chrome pour extraire n'importe quelle offre en 1 clic.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/40 light:bg-slate-50 border border-slate-800 light:border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-white light:text-slate-900">Les 3 Actions Prioritaires à Réaliser Dès Aujourd'hui :</h4>
                  <p><strong>1. Aujourd'hui (J-7) :</strong> Réserver <code>@jnbalign</code> sur TikTok, Instagram et YouTube.</p>
                  <p><strong>2. Demain (J-6) :</strong> Optimiser votre titre de profil LinkedIn personnel et créer la page entreprise officielle JNB Align.</p>
                  <p><strong>3. Dans 2 jours (J-5) :</strong> Enregistrer la vidéo démo de 45 secondes sur l'import d'offre par URL.</p>
                </div>
              </div>
            </div>

            {/* SECTION 10 : KPIS & TABLEAU DE BORD */}
            <div id="doc-sec-kpis" className="space-y-4 pt-4 border-t border-slate-800/60 light:border-slate-200">
              <div className="flex items-center gap-2 text-amber-400 light:text-amber-700 font-bold text-base">
                <BarChart3 className="w-5 h-5" />
                <h3>10. Indicateurs de Performance (KPIs) & Tableau de Bord</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-800 light:border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-900 light:bg-slate-100 text-slate-300 light:text-slate-700 uppercase font-bold">
                    <tr>
                      <th className="p-3">Indicateur Clé</th>
                      <th className="p-3">Objectif de Lancement</th>
                      <th className="p-3">Méthode de Suivi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 light:divide-slate-200 text-slate-300 light:text-slate-700">
                    <tr>
                      <td className="p-3 font-semibold text-white light:text-slate-900">Taux d'Achèvement (Completion Rate)</td>
                      <td className="p-3 font-bold text-emerald-400">≥ 60 % de téléchargements</td>
                      <td className="p-3">Espace Admin sécurisé de l'app</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white light:text-slate-900">Score Moyen d'Amélioration ATS</td>
                      <td className="p-3 font-bold text-amber-400">+35 points minimum</td>
                      <td className="p-3">Moteur de réfraction sémantique</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white light:text-slate-900">Taux de Partage Viral (K-Factor)</td>
                      <td className="p-3 font-bold text-cyan-400">K ≥ 0.25 (1 utilisateur amène 0.25 user)</td>
                      <td className="p-3">Boutons de partage in-app</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white light:text-slate-900">Engagement & Portée LinkedIn</td>
                      <td className="p-3 font-bold text-blue-400">&gt; 50 000 impressions cumulées</td>
                      <td className="p-3">Statistiques natives créateur LinkedIn</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-white light:text-slate-900">Taux de Rétention du Brouillon</td>
                      <td className="p-3 font-bold text-purple-400">≥ 30 % de revisites</td>
                      <td className="p-3">Sauvegarde locale persistant</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 light:border-slate-200 bg-slate-900/60 light:bg-slate-50 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-400 light:text-slate-600">
            Conseil : Vous pouvez cliquer sur <strong>« Imprimer / PDF »</strong> pour l'enregistrer au format PDF sur votre ordinateur.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors cursor-pointer"
          >
            Fermer le guide
          </button>
        </div>
      </div>
    </div>
  );
};
