# HA Companion

Лёгкий, красивый десктопный компаньон для Home Assistant под Windows.
Стек: **Tauri 2 (Rust) + Svelte 5 + TypeScript + Tailwind**.

## Что уже умеет (MVP)

- 🪟 **Выезжающая панель** из иконки в системном трее (клик ЛКМ по иконке).
- 💡 **Кнопки-тогглы** для сущностей HA с живым состоянием (по умолчанию: люстра + LED-лента).
- 🔌 **Подключение к HA** по WebSocket API через Long-Lived Access Token.
- 🌫️ **Acrylic-блюр** панели (нативно, Windows) + плавные анимации.
- ⌨️ **Глобальный хоткей** `Ctrl+Alt+H` — показать/скрыть панель.
- 🖥️ Кнопка **«Открыть полный Home Assistant»** — отдельное окно с веб-версией HA.
- ⚙️ Экран **настроек**: URL, токен, акцентный цвет, прозрачность.
- 👋 **Click-away**: панель прячется при потере фокуса.

## Требования для сборки (на Windows)

1. **Node.js 18+** — https://nodejs.org
2. **Rust** (stable) — https://rustup.rs
3. **Microsoft C++ Build Tools** + **WebView2 Runtime** (на Win11 уже есть).
   Подробности: https://tauri.app/start/prerequisites/

## Запуск (dev)

```bash
npm install
npm run tauri dev
```

При первом запуске откроется экран настроек — вставь URL своего HA и
Long-Lived Access Token (профиль HA → Security → Long-Lived Access Tokens).

## Сборка инсталлятора

```bash
npm run tauri build
```

Готовый `.exe`-инсталлятор появится в
`src-tauri/target/release/bundle/nsis/`.

## Структура

```
ha-companion/
├── index.html              # точка входа webview
├── src/                    # фронтенд (Svelte)
│   ├── App.svelte          # роутинг панель/настройки + анимации
│   ├── lib/
│   │   ├── haClient.ts     # WebSocket-клиент Home Assistant
│   │   ├── store.ts        # конфиг + живые стейты сущностей
│   │   └── components/
│   │       ├── QuickPanel.svelte    # сетка кнопок + запуск полного HA
│   │       ├── ToggleButton.svelte  # плитка-тоггл сущности
│   │       └── Settings.svelte      # экран настроек
│   └── main.ts
└── src-tauri/              # бэкенд (Rust / Tauri)
    ├── src/lib.rs          # трей, хоткей, Acrylic, позиционирование, click-away
    ├── tauri.conf.json     # окно-панель (transparent, borderless, always-on-top)
    ├── capabilities/       # права (permissions) Tauri v2
    └── icons/              # иконки приложения
```

## Дальнейшие шаги (roadmap)

- Редактор карточек сущностей в настройках (drag-and-drop, любой домен/сервис).
- Слайдеры яркости/температуры, медиаплеер-виджет.
- Системные триггеры Windows → HA-сцены (lock/unlock, idle, fullscreen).
- Кастомные темы, Mica-эффект, тонкая настройка анимаций.
- Windows Toast-уведомления из HA-событий.
- Кастомизация глобальных хоткеев под конкретные сущности.

## Заметки по реализации

- Панель — отдельное прозрачное безрамочное окно (`label: "panel"`),
  Acrylic применяется в `lib.rs` через крейт `window-vibrancy`.
- Полный HA открывается как новое окно `WebviewWindow("ha-full", { url })`
  с URL из настроек.
- Позиционирование панели у трея — `tauri-plugin-positioner`
  (`Position::TrayBottomCenter`).
