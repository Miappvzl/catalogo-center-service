'use client';

import { useState, useEffect, useCallback } from 'react';

export type PwaEnvironment =
  | 'native' // Chrome, Edge, Samsung Internet
  | 'in_app_webview' // WhatsApp o Instagram
  | 'ios_safari' // iPhone Safari
  | 'ios_chrome' // iPhone Chrome
  | 'opera_desktop' // 🚀 Opera y Opera GX en computadoras
  | 'desktop_safari' // Mac Safari
  | 'unsupported';

// Variable a nivel de módulo para que el evento no se pierda entre navegaciones de Next.js
let globalDeferredPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e;
  });
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [environment, setEnvironment] = useState<PwaEnvironment>('native');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Detectar si la app YA está instalada y abierta como PWA
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) {
      setCanInstall(false);
      return;
    }

    // 2. Diagnóstico del Entorno mediante User-Agent
    const ua = window.navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isMac = /Macintosh/.test(ua) && 'ontouchend' in document; // iPads nuevos o Mac
    const isInApp = /FBAN|FBAV|Instagram|WhatsApp|Line/i.test(ua);
    const isChromeIOS = /CriOS/i.test(ua);
    const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);

  const isOpera = /OPR\//i.test(ua);
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    if (isInApp) {
      setEnvironment('in_app_webview');
      setCanInstall(true);
    } else if (isIOS || isMac) {
      if (isChromeIOS) {
        setEnvironment('ios_chrome');
      } else {
        setEnvironment('ios_safari');
      }
      setCanInstall(true);
    } else if (isOpera && !isMobile) {
      // 🚀 Detección certera de Opera / Opera GX en PC o Mac
      setEnvironment('opera_desktop');
      setCanInstall(true);
    } else {
      // Android / PC / Linux (Chrome, Edge, Brave)
      setEnvironment('native');
      setCanInstall(true);
    }
    // Escuchar el evento nativo si ocurre después del montaje
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const triggerInstall = useCallback(async () => {
    // Escenario A: Si el navegador tiene el prompt nativo listo (Android / PC)
    if (globalDeferredPrompt) {
      globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setCanInstall(false);
      }
      return;
    }

    // Escenario B: Entornos que requieren guía visual (iOS, WebViews) o donde el prompt aún no cargó
    setIsGuideOpen(true);
  }, []);

  return {
    canInstall: canInstall && !isStandalone,
    isStandalone,
    environment,
    isGuideOpen,
    setIsGuideOpen,
    triggerInstall,
  };
}