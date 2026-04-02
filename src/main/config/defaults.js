/**
 * Builtin configuration defaults
 * Single source of truth for default settings structure
 */

const BUILTIN_DEFAULTS = {
  settings: {
    user: {
      domain: '',
      username: ''
    },
    rdp: {
      // Базовые настройки
      host: '',
      resolution: '800x600',
      colorDepth: '32',

      // Мониторы
      multimon: true,
      span: false,
      startFullScreen: true,

      // Перенаправление устройств
      clipboard: true,
      driveMapping: false,

      // Учётные данные
      promptCredentials: false,
      useAdminSession: false,

      // Аудио
      audio: {
        playback: true,
        capture: true
      },

      // Перенаправление
      redirect: {
        printers: true,
        smartcards: true,
        webauthn: true
      },

      // Производительность
      performance: {
        wallpaper: true,
        fontSmoothing: false,
        desktopComposition: false,
        fullWindowDrag: false,
        menuAnimations: false
      },

      // Кастомные флаги
      customFlags: 'compression:i:1\nnetworkautodetect:i:1\nbandwidthautodetect:i:1\nconnection type:i:7\nvideoplaybackmode:i:1\nautoreconnection enabled:i:1'
    },
    horizon: {
      appName: '',
      userName: '',
      domainName: '',
      desktopProtocol: '',
      desktopLayout: '',
      monitors: '',
      unattended: false,
      nonInteractive: false,
      launchMinimized: false,
      loginAsCurrentUser: false,
      hideClientAfterLaunchSession: false,
      useExisting: false,
      singleAutoConnect: false,
      customPath: '',
      customFlags: ''
    },
    citrix: {
      accountName: '',
      resourceName: '',
      customPath: '',
      customFlags: ''
    },
    general: {
      minimizeToTray: false,
      startMinimized: false
    },
    updates: {
      // Updates are served from custom internal server only
    },
    networkCheck: {
      latencyThresholdMs: 100
    }
  },
  connections: [],
  profiles: []
};

module.exports = { BUILTIN_DEFAULTS };
