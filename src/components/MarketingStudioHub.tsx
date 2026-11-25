import React, { Suspense, useMemo } from 'react';

type AnyComponent = React.ComponentType<any>;
type ModuleLoader = () => Promise<Record<string, any>>;

/**
 * Chargement 100% dynamique et tolérant à l'absence de fichiers via import.meta.glob :
 * - Chaque studio marketing est compilé dans un chunk JS séparé (0 Ko dans le bundle principal).
 * - Si les fichiers marketing ne sont pas présents dans un dépôt Git de production, vite build réussit sans erreur.
 * - Aucun fichier n'est téléchargé tant que le studio correspondant n'est pas ouvert dans AI Studio.
 */
const marketingModalLoaders = import.meta.glob<Record<string, any>>([
  './LogoStudioModal.tsx',
  './MarketingDossierModal.tsx',
  './TikTokVideoModal.tsx',
  './ScreencastJ5Modal.tsx',
  './CarouselJ4Modal.tsx',
  './VideoJ3Modal.tsx',
  './LaunchJ0Modal.tsx',
  './PostLaunchJ1Modal.tsx',
  './VideoJ2Modal.tsx',
  './KitJ3TeardownModal.tsx',
]) as Record<string, ModuleLoader>;

const lazyCache = new Map<string, React.LazyExoticComponent<AnyComponent>>();

function getLazyModal(filePath: string, exportName: string): React.LazyExoticComponent<AnyComponent> | null {
  const loader = marketingModalLoaders[filePath];
  if (!loader) return null;

  const cacheKey = `${filePath}#${exportName}`;
  const existing = lazyCache.get(cacheKey);
  if (existing) return existing;

  const lazyComp = React.lazy<AnyComponent>(async (): Promise<{ default: AnyComponent }> => {
    const mod = await loader();
    const Comp = mod?.[exportName] || mod?.default;
    if (!Comp) {
      const EmptyFallback: AnyComponent = () => null;
      return { default: EmptyFallback };
    }
    return { default: Comp as AnyComponent };
  });

  lazyCache.set(cacheKey, lazyComp);
  return lazyComp;
}

export interface MarketingStudioHubProps {
  isAdmin: boolean;
  isLogoStudioOpen: boolean;
  onCloseLogoStudio: () => void;
  isMarketingDossierOpen: boolean;
  onCloseMarketingDossier: () => void;
  isTikTokModalOpen: boolean;
  onCloseTikTokModal: () => void;
  isScreencastJ5Open: boolean;
  onCloseScreencastJ5: () => void;
  onTryScreencastDemoInStudio: () => void;
  isCarouselJ4Open: boolean;
  onCloseCarouselJ4: () => void;
  isVideoJ3Open: boolean;
  onCloseVideoJ3: () => void;
  isLaunchJ0Open: boolean;
  onCloseLaunchJ0: () => void;
  isPostLaunchJ1Open: boolean;
  onClosePostLaunchJ1: () => void;
  isVideoJ2Open: boolean;
  onCloseVideoJ2: () => void;
  isKitJ3Open: boolean;
  onCloseKitJ3: () => void;
  onOpenScreencastJ5: () => void;
  onOpenCarouselJ4: () => void;
  onOpenVideoJ3: () => void;
  onOpenLaunchJ0: () => void;
  onOpenPostLaunchJ1: () => void;
  onOpenVideoJ2: () => void;
  onOpenKitJ3: () => void;
}

const StudioLoadingOverlay: React.FC = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
    <div className="px-5 py-3 rounded-xl bg-[#0B1530] border border-amber-400/40 text-xs font-semibold text-amber-300 shadow-xl">
      Chargement du studio marketing AI Studio...
    </div>
  </div>
);

export const MarketingStudioHub: React.FC<MarketingStudioHubProps> = ({
  isAdmin,
  isLogoStudioOpen,
  onCloseLogoStudio,
  isMarketingDossierOpen,
  onCloseMarketingDossier,
  isTikTokModalOpen,
  onCloseTikTokModal,
  isScreencastJ5Open,
  onCloseScreencastJ5,
  onTryScreencastDemoInStudio,
  isCarouselJ4Open,
  onCloseCarouselJ4,
  isVideoJ3Open,
  onCloseVideoJ3,
  isLaunchJ0Open,
  onCloseLaunchJ0,
  isPostLaunchJ1Open,
  onClosePostLaunchJ1,
  isVideoJ2Open,
  onCloseVideoJ2,
  isKitJ3Open,
  onCloseKitJ3,
  onOpenScreencastJ5,
  onOpenCarouselJ4,
  onOpenVideoJ3,
  onOpenLaunchJ0,
  onOpenPostLaunchJ1,
  onOpenVideoJ2,
  onOpenKitJ3,
}) => {
  const LogoStudio = useMemo(
    () => (isLogoStudioOpen ? getLazyModal('./LogoStudioModal.tsx', 'LogoStudioModal') : null),
    [isLogoStudioOpen]
  );
  const MarketingDossier = useMemo(
    () => (isMarketingDossierOpen ? getLazyModal('./MarketingDossierModal.tsx', 'MarketingDossierModal') : null),
    [isMarketingDossierOpen]
  );
  const TikTokStudio = useMemo(
    () => (isTikTokModalOpen ? getLazyModal('./TikTokVideoModal.tsx', 'TikTokVideoModal') : null),
    [isTikTokModalOpen]
  );
  const ScreencastJ5 = useMemo(
    () => (isScreencastJ5Open ? getLazyModal('./ScreencastJ5Modal.tsx', 'ScreencastJ5Modal') : null),
    [isScreencastJ5Open]
  );
  const CarouselJ4 = useMemo(
    () => (isCarouselJ4Open ? getLazyModal('./CarouselJ4Modal.tsx', 'CarouselJ4Modal') : null),
    [isCarouselJ4Open]
  );
  const VideoJ3 = useMemo(
    () => (isVideoJ3Open ? getLazyModal('./VideoJ3Modal.tsx', 'VideoJ3Modal') : null),
    [isVideoJ3Open]
  );
  const LaunchJ0 = useMemo(
    () => (isLaunchJ0Open ? getLazyModal('./LaunchJ0Modal.tsx', 'LaunchJ0Modal') : null),
    [isLaunchJ0Open]
  );
  const PostLaunchJ1 = useMemo(
    () => (isPostLaunchJ1Open ? getLazyModal('./PostLaunchJ1Modal.tsx', 'PostLaunchJ1Modal') : null),
    [isPostLaunchJ1Open]
  );
  const VideoJ2 = useMemo(
    () => (isVideoJ2Open ? getLazyModal('./VideoJ2Modal.tsx', 'VideoJ2Modal') : null),
    [isVideoJ2Open]
  );
  const KitJ3 = useMemo(
    () => (isKitJ3Open ? getLazyModal('./KitJ3TeardownModal.tsx', 'KitJ3TeardownModal') : null),
    [isKitJ3Open]
  );

  if (!isAdmin) return null;

  return (
    <Suspense fallback={<StudioLoadingOverlay />}>
      {isTikTokModalOpen && TikTokStudio && (
        <TikTokStudio isOpen={true} onClose={onCloseTikTokModal} />
      )}
      {isLogoStudioOpen && LogoStudio && (
        <LogoStudio isOpen={true} onClose={onCloseLogoStudio} />
      )}
      {isMarketingDossierOpen && MarketingDossier && (
        <MarketingDossier
          isOpen={true}
          onClose={onCloseMarketingDossier}
          onOpenScreencastJ5={onOpenScreencastJ5}
          onOpenCarouselJ4={onOpenCarouselJ4}
          onOpenVideoJ3={onOpenVideoJ3}
          onOpenLaunchJ0={onOpenLaunchJ0}
          onOpenPostLaunchJ1={onOpenPostLaunchJ1}
          onOpenVideoJ2={onOpenVideoJ2}
          onOpenKitJ3={onOpenKitJ3}
        />
      )}
      {isScreencastJ5Open && ScreencastJ5 && (
        <ScreencastJ5
          isOpen={true}
          onClose={onCloseScreencastJ5}
          onTryLiveInStudio={onTryScreencastDemoInStudio}
        />
      )}
      {isCarouselJ4Open && CarouselJ4 && (
        <CarouselJ4 isOpen={true} onClose={onCloseCarouselJ4} />
      )}
      {isVideoJ3Open && VideoJ3 && (
        <VideoJ3 isOpen={true} onClose={onCloseVideoJ3} />
      )}
      {isLaunchJ0Open && LaunchJ0 && (
        <LaunchJ0 isOpen={true} onClose={onCloseLaunchJ0} />
      )}
      {isPostLaunchJ1Open && PostLaunchJ1 && (
        <PostLaunchJ1 isOpen={true} onClose={onClosePostLaunchJ1} />
      )}
      {isVideoJ2Open && VideoJ2 && (
        <VideoJ2 isOpen={true} onClose={onCloseVideoJ2} />
      )}
      {isKitJ3Open && KitJ3 && (
        <KitJ3 isOpen={true} onClose={onCloseKitJ3} />
      )}
    </Suspense>
  );
};
