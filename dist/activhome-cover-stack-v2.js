// Activhome Cover Stack V2 - v0.2.12 (no-build, dependency-free)
// CHANGELOG v0.2.12:
// - FIX NAVIGATION: navigation delegated to Home Assistant via hass-action.
// - FIX NAVIGATION: removed direct browser history navigation to preserve subview history and native Back behavior.
//
// CHANGELOG v0.2.11:
// - FIX: force the left screen icon button to use `var(--primary-text-color)`.
// - FIX: prevents `mdi:projector-screen` from inheriting the iOS/iPadOS blue button tint.
//
// CHANGELOG v0.2.10:
// - CHANGE: the `screen` cover variant now uses the single `mdi:projector-screen` icon.
// - REMOVE: PHU icons are no longer used for the `screen` variant.
//
// Type: custom:activhome-cover-stack-v2
//
// Goal:
// - A single ha-card container with style/theme applied on container
// - Renders a vertical stack of "cover panel" rows ONLY (not generic cards)
// - No divider line between rows, no unexpected spacing
//
// Each row (50px):
// - left: icon depending on cover type
// - middle: name (navigate if tap_action navigate OR navigation_path provided, else more-info)
// - right: open / stop / close
//
// Config:
//   items (required): array of rows
//     - entity (required): cover.xxx
//     - name (optional)
//     - navigation_path (optional): /dashboard/0   (legacy/simple)
//     - tap_action (optional): HA native ui_action (we only use action=navigate + navigation_path)
//     - font_size (optional): "16px".."24px" (empty => container default)
//     - cover_variant (optional): store | store_banne | screen (default: store)
//     - position_mode (optional): native | calculated | none (default: native)
//       calculated expects a standard cover entity provided by activhome_calculated_cover
//     - state_mode (optional): normal | inverted (default: normal)
//
//   style (optional): transparent|activhome|glass|dark_glass|solid|neon_pulse|neon_glow|primary_breathe|primary_tint...
//   theme (optional): HA theme name (applies theme vars to this card container only)
//   card_style (optional): CSS injected into container (targets ha-card)
//   accent_color (optional): "#RRGGBB" (used by neon_glow + primary_* styles via --ah-accent-color)
//   default_font_size (optional): "16px".."24px" (applies if item.font_size is empty)
//
// Notes:
// - If item.font_size is set, it overrides default.
// - Otherwise, default is 20px (guaranteed), unless user sets default_font_size.

(() => {
  function fireEvent(node, type, detail = {}, options = {}) {
    const event = new CustomEvent(type, {
      bubbles: options.bubbles ?? true,
      composed: options.composed ?? true,
      cancelable: options.cancelable ?? false,
      detail,
    });
    node.dispatchEvent(event);
    return event;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // --- Optional Home Assistant theme support -------------------------------
  function _getThemeVars(hass, themeName) {
    const themes = hass?.themes?.themes;
    if (!themes || !themeName) return null;
    const theme = themes[themeName];
    if (!theme) return null;

    // Theme structure can be flat or { modes: { light: {...}, dark: {...} } }
    if (theme.modes && (theme.modes.light || theme.modes.dark)) {
      const modeKey = hass.themes?.darkMode ? "dark" : "light";
      return theme.modes[modeKey] || theme.modes.light || theme.modes.dark || null;
    }
    return theme;
  }

  function _clearTheme(el, prevVars) {
    if (!el || !prevVars) return;
    Object.keys(prevVars).forEach((k) => {
      const cssVar = k.startsWith("--") ? k : `--${k}`;
      el.style.removeProperty(cssVar);
    });
  }

  function _applyTheme(el, hass, themeName, prevVars) {
    const vars = _getThemeVars(hass, themeName);
    if (!vars) return null;

    _clearTheme(el, prevVars);

    Object.entries(vars).forEach(([key, val]) => {
      const cssVar = key.startsWith("--") ? key : `--${key}`;
      el.style.setProperty(cssVar, String(val));
    });
    return vars;
  }
  // -------------------------------------------------------------------------

  function stylePresetCss(styleName) {
    const s = (styleName || "transparent").toLowerCase();
    switch (s) {
      case "activhome":
        return `
          ha-card {
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;

            background-color: rgba(0,0,0,0.40);
            border: 1px solid rgba(255,255,255,0.15);

            border-radius: 16px;
            box-shadow: none;
          }`;

      case "glass":
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;

            background: rgba(255,255,255,0.10);
            border-radius: 16px;
            box-shadow: none;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }`;

      case "dark_glass":
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;
            border-radius: 16px;
            background: rgba(15, 15, 15, 0.55);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.12);
          }`;

      case "solid":
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;

            background: var(--card-background-color, rgba(0,0,0,0.2));
            border-radius: 16px;
            box-shadow: none;
          }`;

      case "neon_pulse":
        return `
          ha-card {
            border-radius: 16px;
            background: rgba(10, 10, 10, 0.45);
            padding: 8px 10px;

            backdrop-filter: blur(8px) brightness(1.1);
            -webkit-backdrop-filter: blur(8px) brightness(1.1);

            border: 1px solid rgba(255, 0, 180, 0.4);

            box-shadow:
              0 0 12px rgba(255, 0, 180, 0.5),
              0 0 24px rgba(255, 0, 180, 0.3),
              0 8px 20px rgba(0, 0, 0, 0.4);

            animation: ah_neon_pulse 12s linear infinite;
            transition:
              box-shadow 0.4s ease,
              border-color 0.4s ease,
              background 0.4s ease;

            will-change: box-shadow, border-color;
          }

          @keyframes ah_neon_pulse {
            0% {
              border-color: rgba(255, 0, 180, 0.5);
              box-shadow:
                0 0 12px rgba(255, 0, 180, 0.6),
                0 0 24px rgba(255, 0, 180, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
            25% {
              border-color: rgba(0, 180, 255, 0.5);
              box-shadow:
                0 0 12px rgba(0, 180, 255, 0.6),
                0 0 24px rgba(0, 180, 255, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
            50% {
              border-color: rgba(0, 255, 120, 0.5);
              box-shadow:
                0 0 12px rgba(0, 255, 120, 0.6),
                0 0 24px rgba(0, 255, 120, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
            75% {
              border-color: rgba(255, 140, 0, 0.5);
              box-shadow:
                0 0 12px rgba(255, 140, 0, 0.6),
                0 0 24px rgba(255, 140, 0, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
            100% {
              border-color: rgba(255, 0, 180, 0.5);
              box-shadow:
                0 0 12px rgba(255, 0, 180, 0.6),
                0 0 24px rgba(255, 0, 180, 0.35),
                0 8px 20px rgba(0, 0, 0, 0.4);
            }
          }`;

      case "neon_glow":
        return `
          ha-card{
            --ah-accent: var(--ah-accent-color, var(--primary-color, #00ffff));

            border-radius: 16px;
            background: rgba(10, 10, 10, 0.45);
            padding: 8px 10px;

            backdrop-filter: blur(6px) brightness(1.1);
            -webkit-backdrop-filter: blur(6px) brightness(1.1);

            border: 1px solid color-mix(in oklab, var(--ah-accent) 55%, transparent);

            box-shadow:
              0 0 10px color-mix(in oklab, var(--ah-accent) 55%, transparent),
              0 0 20px color-mix(in oklab, var(--ah-accent) 35%, transparent),
              0 8px 20px rgba(0, 0, 0, 0.4);

            transition: box-shadow 0.3s ease;
          }

          ha-card:hover{
            box-shadow:
              0 0 14px color-mix(in oklab, var(--ah-accent) 70%, transparent),
              0 0 26px color-mix(in oklab, var(--ah-accent) 45%, transparent),
              0 10px 24px rgba(0, 0, 0, 0.45);
          }`;

      case "primary_breathe":
        return `
          ha-card{
            --ah-accent: var(--ah-accent-color, var(--primary-color));

            border-radius: 16px;

            background: linear-gradient(
              120deg,
              color-mix(in oklab, var(--ah-accent) 20%, rgba(12,12,12,0.55)),
              rgba(12,12,12,0.55)
            );

            padding: 8px 10px;

            backdrop-filter: blur(8px) saturate(115%);
            -webkit-backdrop-filter: blur(8px) saturate(115%);

            border: 1px solid color-mix(in oklab, var(--ah-accent) 60%, transparent);

            box-shadow:
              0 0 10px color-mix(in oklab, var(--ah-accent) 40%, transparent),
              0 8px 20px rgba(0, 0, 0, 0.40);

            transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;

            animation: ah_breathe 5.5s ease-in-out infinite;
            will-change: transform, box-shadow;
            transform: translateZ(0);
          }

          @keyframes ah_breathe {
            0% {
              box-shadow:
                0 0 10px color-mix(in oklab, var(--ah-accent) 40%, transparent),
                0 8px 20px rgba(0, 0, 0, 0.40);
              transform: translateZ(0) scale(1.00);
            }
            50% {
              box-shadow:
                0 0 18px color-mix(in oklab, var(--ah-accent) 65%, transparent),
                0 10px 24px rgba(0, 0, 0, 0.42);
              transform: translateZ(0) scale(1.01);
            }
            100% {
              box-shadow:
                0 0 10px color-mix(in oklab, var(--ah-accent) 40%, transparent),
                0 8px 20px rgba(0, 0, 0, 0.40);
              transform: translateZ(0) scale(1.00);
            }
          }`;

      case "primary_tint":
        return `
          ha-card{
            --ah-accent: var(--ah-accent-color, var(--primary-color));

            border-radius: 16px;

            background: linear-gradient(
              120deg,
              color-mix(in oklab, var(--ah-accent) 18%, rgba(12,12,12,0.55)),
              rgba(12,12,12,0.55)
            );

            padding: 8px 10px;

            backdrop-filter: blur(8px) saturate(115%);
            -webkit-backdrop-filter: blur(8px) saturate(115%);

            border: 1px solid color-mix(in oklab, var(--ah-accent) 65%, transparent);

            box-shadow:
              0 0 12px color-mix(in oklab, var(--ah-accent) 45%, transparent),
              0 8px 20px rgba(0, 0, 0, 0.40);

            transition:
              box-shadow 0.25s ease,
              border-color 0.25s ease,
              background 0.25s ease;
          }

          ha-card:hover{
            box-shadow:
              0 0 16px color-mix(in oklab, var(--ah-accent) 60%, transparent),
              0 10px 24px rgba(0, 0, 0, 0.42);

            border-color: color-mix(in oklab, var(--ah-accent) 80%, transparent);
          }`;

      case "transparent":
      default:
        return `
          ha-card{
            --mdc-icon-size: 0px;
            --ha-card-padding: 10px;

            padding: var(--ha-card-padding) !important;

            background: none;
            box-shadow: none;
          }`;
    }
  }

  function _toNumberPx(v) {
    // Accept numbers, numeric strings, and strings like "350px" or "350 px".
    if (v == null) return NaN;
    if (typeof v === "number") return v;
    const s = String(v).trim().toLowerCase();
    if (!s) return NaN;
    const n = parseFloat(s.replace(/px/g, "").trim());
    return n;
  }

  function clampInt(n, min, max, fallback) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.min(max, Math.max(min, Math.round(x)));
  }

  function clampFloat(n, min, max, fallback) {
    const x = Number(n);
    if (!Number.isFinite(x)) return fallback;
    return Math.min(max, Math.max(min, x));
  }

  // Same mapping as your template
  function getStoreIconFileFromPosition(pos) {
    const p = clampInt(pos ?? 0, 0, 100, 0);
    if (p === 0) return 100; // fully closed
    const step = Math.floor((p - 1) / 10) * 10;
    const file = 100 - (step + 10);
    return clampInt(file, 0, 100, 100);
  }

  function getStoreBanneIconFileFromPosition(pos) {
    const p = clampInt(pos ?? 0, 0, 100, 0);
    const file = Math.floor(p / 10) * 10;
    return clampInt(file, 0, 100, 0);
  }

  function normalizeCoverVariant(v) {
    const s = String(v || "store").toLowerCase();

    if (s === "store_banne") return "store_banne";
    if (s === "screen") return "screen";

    return "store";
  }

  function normalizeStateMode(v) {
    return String(v || "normal").toLowerCase() === "inverted" ? "inverted" : "normal";
  }

  function getDisplayPosition(stateObj, stateMode = "normal") {
    const raw = stateObj?.attributes?.current_position;
    if (raw == null) return null;

    const p = clampInt(raw, 0, 100, 0);
    return stateMode === "inverted" ? 100 - p : p;
  }

  function getBanneEtat(stateObj, stateMode = "normal") {
    const st = String(stateObj?.state ?? "unknown").toLowerCase();

    if (stateMode === "inverted") {
      if (st === "open" || st === "opening") return "Fermé";
      if (st === "closed" || st === "closing") return "Ouvert";
      return "";
    }

    if (st === "open" || st === "opening") return "Ouvert";
    if (st === "closed" || st === "closing") return "Fermé";
    return "";
  }

  class ActivhomeCoverStack extends HTMLElement {
    set hass(hass) {
      this._hass = hass;

      // ✅ iOS stability: do NOT re-render the whole DOM on every hass update
      // Full DOM replacement can cause Safari/WebView to snap scroll position.
      if (!this.shadowRoot) return;

      // First render (or if config not set yet)
      if (!this._config || !this._didRenderOnce) {
        this._render();
        this._didRenderOnce = true;
        return;
      }

      // Light update only
      this._updateFromHass();
    }

    setConfig(config) {
      if (!config || !Array.isArray(config.items) || config.items.length === 0) {
        throw new Error("activhome-cover-stack-v2: 'items' (non-empty array) is required");
      }
      const style = config.style ?? "transparent";
      const height_mode = (config.height_mode === "total") ? "total" : "row";
      const row_height = config.row_height;
      const target_total_height = config.target_total_height;
      const target_total_includes_padding = (config.target_total_includes_padding !== false);
      this._config = { ...config, style, height_mode, row_height, target_total_height, target_total_includes_padding, arrows_button_width: config.arrows_button_width, stop_button_width: config.stop_button_width };
      this._render();
    }

    getCardSize() {
      return Math.max(1, this._config?.items?.length || 1);
    }

    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._render();

      // Responsive actions sizing (native-like): keep text size, shrink action buttons/icons on narrow cards
      if (!this._roActions && typeof ResizeObserver !== "undefined") {
        this._roActions = new ResizeObserver(() => this._applyResponsiveActions());
        this._roActions.observe(this);
      }
      this._applyResponsiveActions();
    }

    disconnectedCallback() {
      if (this._roActions) {
        try { this._roActions.disconnect(); } catch (e) {}
        this._roActions = null;
      }
    }
    _applyResponsiveActions() {
          // Default (large / iPad Pro / desktop): 60px actions, 32px icons
          const w = this.getBoundingClientRect?.().width || 0;

          let actionW = 60;
          let gap = 6;
          let icon = 32;

          // iPad 3 columns / medium: tighten a bit
          if (w > 0 && w < 520) {
            actionW = 52;
            gap = 5;
            icon = 28;
          }

          // Very narrow: keep click targets decent, shrink icons more
          if (w > 0 && w < 420) {
            actionW = 52; // keep tap area acceptable
            gap = 5;
            icon = 28;
          }

          // Default: arrows and stop follow responsive actionW
          let arrowsW = actionW;
          let stopW = actionW;

          // If user provides widths in config, they override responsive
          const cfgArrows = _toNumberPx(this._config?.arrows_button_width);
          const cfgStop = _toNumberPx(this._config?.stop_button_width);

          if (Number.isFinite(cfgArrows)) arrowsW = clampInt(cfgArrows, 40, 140, arrowsW);
          if (Number.isFinite(cfgStop)) stopW = clampInt(cfgStop, 40, 140, stopW);

          this.style.setProperty("--ah-action-w", `${arrowsW}px`); // arrows
          this.style.setProperty("--ah-stop-w", `${stopW}px`);     // stop
          this.style.setProperty("--ah-action-gap", `${gap}px`);
          this.style.setProperty("--ah-action-icon", `${icon}px`);
        }


    _openMoreInfo(entityId) {
      fireEvent(this, "hass-more-info", { entityId });
    }

    _navigate(path) {
      if (!path) return;
      fireEvent(this, "hass-action", {
        config: {
          tap_action: {
            action: "navigate",
            navigation_path: path,
          },
        },
        action: "tap",
      });
    }

    _callCoverService(entityId, service) {
      if (!entityId) return;
      this._hass?.callService("cover", service, { entity_id: entityId });
    }

    _callCoverSetPosition(entityId, position) {
      if (!entityId) return;
      const p = clampInt(position, 0, 100, 0);
      this._hass?.callService("cover", "set_cover_position", {
        entity_id: entityId,
        position: p,
      });
    }

    _render() {
      if (!this.shadowRoot || !this._config) return;
      const hass = this._hass;

      const itemsCount = Math.max(1, (this._config.items || []).length);
      const mode = (this._config.height_mode === "total") ? "total" : "row";

      // Height logic:
      // - mode=row: row_height (int px, integer)
      // - mode=total: target_total_height defines the TOTAL *outer* card height in px.
      //   We derive a row height from the *inner* available height (total minus padding),
      //   and we keep things consistent with min/max row height by adjusting the effective total if needed.
      let rowH;
      let forcedTotal = null; // effective total height applied to ha-card in total mode
      let requestedTotalForPostMeasure = null; // keep user's requested OUTER height for post-render padding measure

      // First pass (before we can measure actual padding): assume 0 padding.
      // We'll correct precisely after render by measuring ha-card padding and recomputing.
      if (mode === "total" && this._config.target_total_height != null && this._config.target_total_height !== "") {
        const requestedTotal = _toNumberPx(this._config.target_total_height);

        if (Number.isFinite(requestedTotal)) {
          requestedTotalForPostMeasure = requestedTotal;
          const computed = requestedTotal / itemsCount;
          const clampedRow = Math.min(Math.max(computed, 50), 220);
          rowH = Math.round(clampedRow * 100) / 100;
          forcedTotal = Math.round((rowH * itemsCount) * 100) / 100;
        } else {
          rowH = clampInt(this._config.row_height, 50, 220, 50);
        }
      } else {
        rowH = clampInt(this._config.row_height, 50, 220, 50);
      }
      const presetCss = stylePresetCss(this._config.style);
      const customCss = this._config.card_style ? `\n/* card_style */\n${this._config.card_style}\n` : "";

      const totalHeightCss = (mode === "total" && Number.isFinite(forcedTotal))
        ? `
          /* TOTAL MODE: flex container (height will be set inline after padding measure) */
          ha-card{
            box-sizing: border-box; /* includes padding/border in the fixed height */
            display: flex;
            flex-direction: column;
          }
          .list{
            flex: 1 1 auto;
            min-height: 0; /* allows the flex child to shrink correctly */
          }
        `
        : "";

      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; --ah-row-height: ${rowH}px; --ah-action-w: 60px; --ah-stop-w: 60px; --ah-action-gap: 6px; --ah-action-icon: 32px; }

          ha-card{
            padding: 0;
            --ha-card-border-width: 0px;
            color: var(--primary-text-color);
          }
          ${totalHeightCss}
          ${presetCss}
          ${customCss}

          .list{
            display: flex;
            flex-direction: column;
          }

          .row{
            display:grid;
            grid-template-columns: 48px 1fr var(--ah-action-w) var(--ah-stop-w) var(--ah-action-w);
            align-items:center;
            column-gap: var(--ah-action-gap);
            height:var(--ah-row-height);
          }
          button{
            font: inherit;
            -webkit-tap-highlight-color: transparent;
            outline: none;
            touch-action: manipulation;
          }
          button:focus,
          button:focus-visible{
            outline: none !important;
          }

          .iconBtn{
            height:var(--ah-row-height); width:48px;
            display:flex; align-items:center; justify-content:center;
            background:none; border:none; padding:0;
            cursor:pointer;
            color: var(--primary-text-color); /* Prevent iOS/iPadOS default blue tint */
          }

          .iconImg{
            width: 44px;
            height: 44px;
            object-fit: contain;
            display: block;
            filter: invert(1) brightness(2);
          }


          /* Store banne: enlarge icon (legacy look) */
          .iconImg.banne{
            width: 100% !important;
            height: 100% !important;
            transform: translateY(-6px);
          }

          .nameBtn{
            height:var(--ah-row-height);
            background:none; border:none;
            padding:0 0 0 4px;
            text-align:left;
            min-width:0;
            display:flex; align-items:center;
            cursor:pointer;
          }

          .name{
            font-size: var(
              --ah-font-size,
              var(
                --ha-font-size-m,
                var(--paper-font-body1_-_font-size, 20px)
              )
            );
            font-weight: var(
              --ha-font-weight-normal,
              var(--paper-font-body1_-_font-weight, 500)
            );
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
            width:100%;
            color: var(--primary-text-color);
          }

          .actionBtn{
            height:var(--ah-row-height); width:var(--ah-action-w);
            display:flex; align-items:center; justify-content:center;
            background:none; border:none; padding:0;
            cursor:pointer;
            border-radius:10px;
            transition: background-color 120ms ease;
            color: var(--primary-text-color); /* ✅ avoid HA default blue */
          }
          .stopBtn{ width: var(--ah-stop-w); }
          .actionBtn:hover{ background: color-mix(in oklab, currentColor 12%, transparent); }
          .actionBtn:active{ background: color-mix(in oklab, currentColor 18%, transparent); }
          
          /* ✅ iOS/tactile : feedback au tap conservé, sans effet stroboscope */
          @media (hover: none) and (pointer: coarse) {
            .actionBtn,
            .iconBtn,
            .nameBtn {
              transition: none !important; /* supprime la source du flash iOS */
            }
            
            /* iOS : empêche le hover "collé" après tap */
            .actionBtn:hover,
            .iconBtn:hover,
            .nameBtn:hover {
              background: none !important;
            }
        
          /* Feedback "pressed" stable (pas de color-mix) */
            .actionBtn:active,
            .iconBtn:active,
            .nameBtn:active {
              background: rgba(255, 255, 255, 0.10) !important;
            }
          }

          ha-icon{ --mdc-icon-size: var(--ah-action-icon); color: currentColor; }
        </style>

        <ha-card>
          <div class="list" id="list"></div>
        </ha-card>
      `;

      const cardEl = this.shadowRoot.querySelector("ha-card");

      // Apply optional HA theme to container
      const themeName = (this._config.theme || "").trim();
      if (cardEl) {
        if (themeName) {
          this._appliedThemeVars = _applyTheme(cardEl, hass, themeName, this._appliedThemeVars);
        } else if (this._appliedThemeVars) {
          _clearTheme(cardEl, this._appliedThemeVars);
          this._appliedThemeVars = null;
        }

        // Optional container accent color (used by neon_glow + primary_* styles)
        const acc = (this._config.accent_color || "").trim();
        if (acc) cardEl.style.setProperty("--ah-accent-color", acc);
        else cardEl.style.removeProperty("--ah-accent-color");

        // Default font size: guaranteed 20px unless user sets default_font_size
        const dfs = (this._config.default_font_size || "").trim();
        cardEl.style.setProperty("--ah-default-font-size", dfs || "20px");
      }

      const list = this.shadowRoot.getElementById("list");
      if (!list) return;

      const items = this._config.items || [];
      items.forEach((it) => {
        const entityId = (it?.entity || "").trim();
        if (!entityId) return;

        const stateObj = hass?.states?.[entityId];

        // Per-item variant / state interpretation (fail-safe)
        const coverVariant = normalizeCoverVariant(it?.cover_variant);
        const positionMode = String(it?.position_mode || "native").toLowerCase();
        const stateMode =
          positionMode === "native"
            ? normalizeStateMode(it?.state_mode)
            : "normal";

        let iconSrc = "";
        const baseName =
          (it?.name || "").trim() ||
          (stateObj?.attributes?.friendly_name || "") ||
          entityId;

        let displayName = baseName;

        if (coverVariant === "store_banne" || coverVariant === "screen") {
          // Same icon for open/closed + state appended to name (no dash)
          if (coverVariant === "store_banne") {
            const pos = getDisplayPosition(stateObj, stateMode) ?? 0;
            const file = getStoreBanneIconFileFromPosition(pos);
            iconSrc = `/local/community/activhome-icons/icons/storebanne_${file}.svg?v=1`;
          } else {
            iconSrc = "mdi:projector-screen";
          }
          const etat = getBanneEtat(stateObj, stateMode);
          if (etat) displayName = `${baseName} ${etat}`;
        } else {
          const pos = getDisplayPosition(stateObj, stateMode) ?? 0;
          const file = getStoreIconFileFromPosition(pos);
          iconSrc = `/local/community/activhome-icons/icons/store_${file}.svg?v=1`;
        }

        const row = document.createElement("div");
        row.className = "row";
        row.dataset.entity = entityId;
        row.dataset.variant = coverVariant;
        row.dataset.stateMode = stateMode;
        row.dataset.baseName = baseName;

        // Per-item font size:
        // - if item.font_size: use it
        // - else use container default font size (guaranteed 20px)
        const rowFontSize = (it?.font_size || "").trim();
        const containerDefaultFs = (this._config.default_font_size || "").trim() || "20px";
        row.style.setProperty("--ah-font-size", rowFontSize || containerDefaultFs);

        row.innerHTML = `
          <button class="iconBtn" data-action="more-info" aria-label="Plus d’informations" tabindex="-1" type="button">
            ${
              coverVariant === "screen"
                ? `<ha-icon icon="${iconSrc}"></ha-icon>`
                : `<img class="iconImg ${coverVariant === "store_banne" ? "banne" : ""}" alt="" src="${escapeHtml(iconSrc)}">`
            }
          </button>

          <button class="nameBtn" data-action="name" aria-label="Navigate or more-info" tabindex="-1" type="button">
            <span class="name">${escapeHtml(displayName)}</span>
          </button>

          <button class="actionBtn" data-action="open" aria-label="Open" tabindex="-1" type="button">
            <ha-icon icon="mdi:arrow-up"></ha-icon>
          </button>

          <button class="actionBtn stopBtn" data-action="stop" aria-label="Stop" tabindex="-1" type="button">
            <ha-icon icon="mdi:stop"></ha-icon>
          </button>

          <button class="actionBtn" data-action="close" aria-label="Close" tabindex="-1" type="button">
            <ha-icon icon="mdi:arrow-down"></ha-icon>
          </button>
        `;


        // iOS Safari: mitigate focus-induced auto-scroll WITHOUT canceling clicks.
        // IMPORTANT: Do NOT call preventDefault() here, otherwise iOS may stop firing "click".
        const _blurOnPress = (ev) => {
          const btn = ev.target?.closest?.("button");
          if (!btn) return;
          // Defer blur so the click can still be generated reliably.
          requestAnimationFrame(() => { try { btn.blur(); } catch (_) {} });
        };
        row.addEventListener("pointerdown", _blurOnPress);
        row.addEventListener("touchstart", _blurOnPress, { passive: true });

        row.addEventListener("click", (ev) => {
          const btn = ev.target?.closest?.("button");
          if (!btn) return;

          try { btn.blur(); } catch (_) {}

          const action = btn.getAttribute("data-action");

          if (action === "more-info") {
            this._openMoreInfo(entityId);
            return;
          }

          if (action === "name") {
            // ✅ Optional HA native action (we only support navigate here)
            const ta = it?.tap_action;
            if (ta && typeof ta === "object") {
              const a = String(ta.action || "").toLowerCase();
              if (a === "navigate") {
                const p = String(ta.navigation_path || "").trim();
                if (p) {
                  this._navigate(p);
                  return;
                }
              }
            }

            // ✅ Backward-compatible behavior (unchanged)
            const path = (it?.navigation_path || "").trim();
            if (path) this._navigate(path);
            else this._openMoreInfo(entityId);
            return;
          }

          if (action === "open") {
            const service = coverVariant === "store_banne" ? "close_cover" : "open_cover";
            this._callCoverService(entityId, service);
            return;
          }

          if (action === "stop") {
            this._callCoverService(entityId, "stop_cover");
            return;
          }

          if (action === "close") {
            const service = coverVariant === "store_banne" ? "open_cover" : "close_cover";
            this._callCoverService(entityId, service);
            return;
          }
        });

        list.appendChild(row);
      });

      // Post-render precise calibration for TOTAL mode.
      // Why? Presets / card_style may add padding to ha-card, and box-sizing means
      // By default, target_total_height is the OUTER card height (padding included).
      // If target_total_includes_padding=false, we interpret target_total_height as the INNER (lines) height and add padding automatically.
      // and then re-apply an effective total height consistent with the min/max row bounds.
      if (mode === "total" && Number.isFinite(requestedTotalForPostMeasure)) {
        const haCard = this.shadowRoot.querySelector("ha-card");
        if (haCard) {
          requestAnimationFrame(() => {
            try {
              const cs = getComputedStyle(haCard);
              const padTop = parseFloat(cs.paddingTop) || 0;
              const padBottom = parseFloat(cs.paddingBottom) || 0;

              const bTop = parseFloat(cs.borderTopWidth) || 0;
              const bBottom = parseFloat(cs.borderBottomWidth) || 0;

              const includesPadding = (this._config && this._config.target_total_includes_padding !== false);
              const innerAvailable = Math.max((includesPadding ? (requestedTotalForPostMeasure - padTop - padBottom - bTop - bBottom) : requestedTotalForPostMeasure), 0);
              const computed = innerAvailable / itemsCount;
              const clampedRow = Math.min(Math.max(computed, 50), 220);
              const finalRow = Math.round(clampedRow * 100) / 100;
              const finalTotal = Math.round((finalRow * itemsCount + padTop + padBottom + bTop + bBottom) * 100) / 100;

              // Override the CSS variable set in <style> (inline wins)
              this.style.setProperty("--ah-row-height", `${finalRow}px`);
              // Lock final outer height (includes padding thanks to border-box)
              haCard.style.height = `${finalTotal}px`;
            } catch (e) {
              // Silent: if anything goes wrong, keep the first-pass render.
            }
          });
        }
      }

      this._didRenderOnce = true;

      // Ensure actions sizing matches current width (also after re-render)
      this._applyResponsiveActions();
    }



    _updateFromHass() {
      const hass = this._hass;
      if (!hass || !this.shadowRoot || !this._config) return;

      // Keep optional theme vars in sync with current mode (light/dark)
      const cardEl = this.shadowRoot.querySelector("ha-card");
      const themeName = (this._config.theme || "").trim();
      if (cardEl) {
        if (themeName) {
          this._appliedThemeVars = _applyTheme(cardEl, hass, themeName, this._appliedThemeVars);
        } else if (this._appliedThemeVars) {
          _clearTheme(cardEl, this._appliedThemeVars);
          this._appliedThemeVars = null;
        }
      }

      const rows = this.shadowRoot.querySelectorAll(".row");
      rows.forEach((row) => {
        const entityId = row?.dataset?.entity;
        if (!entityId) return;

        const stateObj = hass.states?.[entityId];
        const variant = row.dataset.variant || "store";
        const stateMode = row.dataset.stateMode || "normal";

        // Update name (store_banne appends state)
        const nameSpan = row.querySelector(".name");
        if (nameSpan) {
          if (variant === "store_banne") {
            const base = row.dataset.baseName || nameSpan.textContent || "";
            const etat = getBanneEtat(stateObj, stateMode);
            nameSpan.textContent = etat ? `${base} ${etat}` : base;
          }
        }

        // Update icon for classic store (dynamic svg based on current_position)
        const img = row.querySelector("img.iconImg");

        if (img) {
          const pos = stateObj?.attributes?.current_position ?? 0;

          let src = "";

          if (variant === "store_banne") {
            const file = getStoreBanneIconFileFromPosition(pos);
            src = `/local/community/activhome-icons/icons/storebanne_${file}.svg?v=1`;
          } else if (variant === "store") {
            const file = getStoreIconFileFromPosition(pos);
            src = `/local/community/activhome-icons/icons/store_${file}.svg?v=1`;
          }

          if (src && img.getAttribute("src") !== src) {
            img.setAttribute("src", src);
          }
        }
      });

      // Also keep responsive sizes in sync
      this._applyResponsiveActions();
    }
    static getConfigElement() {
      return document.createElement("activhome-cover-stack-v2-editor");
    }

    static getStubConfig() {
      return {
        type: "custom:activhome-cover-stack-v2",
        style: "activhome",
        theme: "",
        card_style: "",
        accent_color: "",
        default_font_size: "", // UI can override; runtime default is 20px
        height_mode: "row", // row | total
        row_height: 50, // px (default, min 50)
        target_total_height: "", // px (used when height_mode=total)
        arrows_button_width: "", // px (optional)
        stop_button_width: "", // px (optional)
        items: [
          {
            entity: "cover.example",
            position_mode: "native",
            navigation_path: "/dashboard/0",
            tap_action: { action: "navigate", navigation_path: "/dashboard/0" },
            font_size: "",
          },
        ],
      };
    }
  }

  class ActivhomeCoverStackEditor extends HTMLElement {
    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;

      if (this._schema) {
        const themeNames = Object.keys(this._hass?.themes?.themes || {}).sort((a, b) => a.localeCompare(b));
        const themeField = this._schema.find((f) => f.name === "theme");
        if (themeField && themeField.selector?.select) {
          themeField.selector.select.options = [{ label: "Aucun", value: "" }].concat(
            themeNames.map((t) => ({ label: t, value: t }))
          );
        }
        if (this._form) this._form.schema = this._schema;
      }
    }

    setConfig(config) {
      this._config = {
        style: "transparent",
        theme: "",
        card_style: "",
        accent_color: "",
        default_font_size: "",
        height_mode: "row",
        row_height: 50,
        target_total_height: "",
        items: [],
        ...config,
      };
      this._ensureRendered();
      this._refresh();
    }

    connectedCallback() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      this._ensureRendered();
      this._refresh();
    }

    _ensureRendered() {
      if (this._rendered) return;
      this._rendered = true;

      this.shadowRoot.innerHTML = `
        <style>
          .wrap { display: grid; gap: 12px; }
          .sectionTitle { font-weight: 600; }
          .items { display: grid; gap: 10px; }
          .itemCard {
            border: 1px solid color-mix(in oklab, var(--primary-text-color) 18%, transparent);
            border-radius: 12px;
            padding: 10px;
          }
          .itemHeader { display:flex; align-items:center; justify-content: space-between; gap: 8px; }
          .btnRow { display:flex; gap: 6px; }
          button {
            cursor: pointer;
            border-radius: 10px;
            padding: 6px 10px;
            border: 1px solid color-mix(in oklab, var(--primary-text-color) 18%, transparent);
            background: none;
            color: var(--primary-text-color);
          }
          button:hover { background: color-mix(in oklab, var(--primary-text-color) 8%, transparent); }
          button:disabled { opacity: 0.4; cursor: default; }
          .hint { opacity:0.8; font-size: 12px; line-height: 1.3; }
          code { font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace); }
        </style>

        <div class="wrap">
          <ha-form id="form"></ha-form>

          <div>
            <div class="sectionTitle">Items</div>
            <div class="items" id="items"></div>
            <div style="margin-top:10px;">
              <button id="add">+ Ajouter un volet/store</button>
            </div>
            <div class="hint" style="margin-top:6px;">
              Chaque item crée une ligne "Cover Panel" (icône dynamique + nom + ouvrir/stop/fermer).
            </div>
          </div>

          <div class="hint">
            <div><b>CSS avancé</b> : le contenu de <code>card_style</code> est injecté tel quel dans la carte.</div>
            <div>Pour modifier le fond/radius/ombre, cible <code>ha-card { ... }</code>.</div>
          </div>
        </div>
      `;

      this._form = this.shadowRoot.getElementById("form");
      if (this._hass) this._form.hass = this._hass;

      this._schema = [
        {
          name: "theme",
          label: "Theme conteneur (optionnel)",
          selector: { select: { options: [{ label: "Aucun", value: "" }], mode: "dropdown" } },
        },
        {
          name: "style",
          label: "Style conteneur",
          selector: {
            select: {
              options: [
                { label: "Transparent", value: "transparent" },
                { label: "Activhome", value: "activhome" },
                { label: "Glass", value: "glass" },
                { label: "Dark glass (Activhome)", value: "dark_glass" },
                { label: "Solid", value: "solid" },
                { label: "Neon Pulse", value: "neon_pulse" },
                { label: "Neon Glow", value: "neon_glow" },
                { label: "Primary + Breathe", value: "primary_breathe" },
                { label: "Primary Tint", value: "primary_tint" },
              ],
              mode: "dropdown",
            },
          },
        },
        {
          name: "default_font_size",
          label: "Taille police par défaut (optionnel)",
          selector: {
            select: {
              options: [
                { label: "Par défaut (20)", value: "" },
                { label: "16", value: "16px" },
                { label: "17", value: "17px" },
                { label: "18", value: "18px" },
                { label: "19", value: "19px" },
                { label: "20", value: "20px" },
                { label: "21", value: "21px" },
                { label: "22", value: "22px" },
                { label: "23", value: "23px" },
                { label: "24", value: "24px" },
              ],
              mode: "dropdown",
            },
          },
        },
        {
          name: "height_mode",
          label: "Mode de hauteur",
          selector: {
            select: {
              options: [
                { label: "Hauteur par ligne", value: "row" },
                { label: "Hauteur totale cible", value: "total" },
              ],
              mode: "dropdown",
            },
          },
        },
        {
          name: "row_height",
          label: "Hauteur des lignes (px)",
          selector: { number: { min: 50, max: 220, step: 1, mode: "box" } },
        },
        {
          name: "target_total_height",
          label: "Hauteur totale cible (px)",
          selector: { number: { min: 50, max: 2000, step: 1, mode: "box" } },
        },
        {
          name: "arrows_button_width",
          label: "Largeur boutons flèches (ouvrir/fermer)",
          selector: { number: { min: 40, max: 140, step: 1, mode: "box" } },
        },
        {
          name: "stop_button_width",
          label: "Largeur bouton STOP",
          selector: { number: { min: 40, max: 140, step: 1, mode: "box" } },
        },
        {
          name: "La hauteur saisie correspond à la hauteur totale de la carte",
          label: "Inclure le padding dans la hauteur totale",
          selector: { boolean: {} },
        },
        { name: "accent_color", label: "Couleur accent (Neon/Primary seulement, optionnel)", selector: { text: {} } },
        { name: "card_style", label: "CSS avancé (optionnel)", selector: { text: { multiline: true } } },
      ];

      // Populate theme dropdown from HA
      const themeNames = Object.keys(this._hass?.themes?.themes || {}).sort((a, b) => a.localeCompare(b));
      const themeField = this._schema.find((f) => f.name === "theme");
      if (themeField && themeField.selector?.select) {
        themeField.selector.select.options = [{ label: "Aucun", value: "" }].concat(
          themeNames.map((t) => ({ label: t, value: t }))
        );
      }

      this._form.schema = this._schema;

      this._form.addEventListener("value-changed", (ev) => {
        const v = ev.detail?.value || {};
        const merged = { ...this._config, ...v, type: "custom:activhome-cover-stack-v2" };

        // Clean empties
        ["theme", "card_style", "default_font_size", "accent_color", "arrows_button_width", "stop_button_width"].forEach((k) => {
          if (merged[k] === "" || merged[k] == null) delete merged[k];
        });

        // Height mode cleanup
        const mode = (merged.height_mode === "total") ? "total" : "row";

        // Make the two height modes mutually exclusive to avoid confusion:
        // - total mode: ignore and omit row_height from YAML
        // - row mode: ignore and omit target_total_height from YAML
        if (mode === "total") {
          if (merged.row_height != null) delete merged.row_height;
        } else {
          if (merged.target_total_height != null) delete merged.target_total_height;
        }

        // Total height padding basis:
        // - Only relevant in total mode
        // - Default is true (includes padding) => omit from YAML
        if (mode !== "total") {
          if (merged.target_total_includes_padding != null) delete merged.target_total_includes_padding;
        } else {
          if (merged.target_total_includes_padding === true) delete merged.target_total_includes_padding;
        }

        // row height: default 50px => omit (only relevant in row mode)
        if (mode === "row" && (merged.row_height == null || merged.row_height === 50)) delete merged.row_height;

        // target total height: empty => omit (only relevant in total mode)
        if (mode === "total" && (merged.target_total_height === "" || merged.target_total_height == null)) delete merged.target_total_height;

        // Height mode persistence:
        // IMPORTANT: do NOT delete height_mode when user selects "total" before entering a target.
        // Otherwise the next value-changed event (target_total_height) would not carry height_mode,
        // and the card would stay in row mode.
        // Keep YAML clean by omitting height_mode only when mode=row.
        if (mode === "row") delete merged.height_mode;

        if (!merged.style) merged.style = "transparent";
        if (!Array.isArray(merged.items)) merged.items = [];

        this._config = merged;
        fireEvent(this, "config-changed", { config: merged });
        this._refreshItems();
      });

      this.shadowRoot.getElementById("add")?.addEventListener("click", () => {
        const next = { ...this._config };
        next.items = Array.isArray(next.items) ? [...next.items] : [];
        next.items.push({
          entity: "",
          name: "",
          navigation_path: "",
          tap_action: undefined,
          font_size: "",
          position_mode: "native",
        });
        this._config = next;
        this._emit();
        this._refreshItems();
      });
    }

    _emit() {
      const clean = { ...this._config, type: "custom:activhome-cover-stack-v2" };

      // Clean item empties
      clean.items = (clean.items || []).map((it) => {
        const out = { ...it };
        ["name", "navigation_path", "tap_action", "font_size", "cover_variant", "position_mode", "state_mode"].forEach((k) => {
          if (out[k] === "" || out[k] == null) delete out[k];
        });

        // Keep YAML clean: store is default => omit cover_variant
        if ((out.cover_variant || "store") === "store") delete out.cover_variant;

        // state_mode is only meaningful with native position mode.
        const positionMode = out.position_mode || "native";
        if (positionMode !== "native") delete out.state_mode;

        // Native / normal are defaults => omit from YAML.
        if (positionMode === "native") delete out.position_mode;
        if ((out.state_mode || "normal") === "normal") delete out.state_mode;

        return out;
      });

      fireEvent(this, "config-changed", { config: clean });
    }

    _refresh() {
      if (!this._form || !this._config) return;

      this._form.data = {
        theme: this._config.theme || "",
        style: this._config.style || "transparent",
        default_font_size: this._config.default_font_size || "",
        height_mode: this._config.height_mode || "row",
        row_height: this._config.row_height ?? 50,
        target_total_height: this._config.target_total_height ?? "",
        arrows_button_width: this._config.arrows_button_width ?? "",
        stop_button_width: this._config.stop_button_width ?? "",
        target_total_includes_padding: (this._config.target_total_includes_padding !== false),
        accent_color: this._config.accent_color || "",
        card_style: this._config.card_style || "",
      };

      this._refreshItems();
    }

    _refreshItems() {
      const host = this.shadowRoot.getElementById("items");
      if (!host) return;

      const items = Array.isArray(this._config.items) ? this._config.items : [];

      // Element réellement focus dans le shadowRoot (input, textarea, etc.)
      const focusedEl = this.shadowRoot.querySelector(":focus");

      // --- 1) Rebuild UNIQUEMENT si le nombre d'items a changé ---
      if (host.childElementCount !== items.length) {
        host.innerHTML = "";

        items.forEach((it, idx) => {
          const wrap = document.createElement("div");
          wrap.className = "itemCard";

          const header = document.createElement("div");
          header.className = "itemHeader";
          header.innerHTML = `<div><b>Item ${idx + 1}</b></div>`;

          const btnRow = document.createElement("div");
          btnRow.className = "btnRow";

          const up = document.createElement("button");
          up.textContent = "↑";
          up.disabled = idx === 0;
          up.addEventListener("click", () => {
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };
            const tmp = next.items[idx - 1];
            next.items[idx - 1] = next.items[idx];
            next.items[idx] = tmp;
            this._config = next;
            this._emit();
            this._refreshItems(); // length unchanged => update, no DOM wipe
          });

          const down = document.createElement("button");
          down.textContent = "↓";
          down.disabled = idx === items.length - 1;
          down.addEventListener("click", () => {
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };
            const tmp = next.items[idx + 1];
            next.items[idx + 1] = next.items[idx];
            next.items[idx] = tmp;
            this._config = next;
            this._emit();
            this._refreshItems();
          });

          const del = document.createElement("button");
          del.textContent = "Supprimer";
          del.addEventListener("click", () => {
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };
            next.items.splice(idx, 1);
            this._config = next;
            this._emit();
            this._refreshItems(); // length changed => rebuild
          });

          btnRow.appendChild(up);
          btnRow.appendChild(down);
          btnRow.appendChild(del);
          header.appendChild(btnRow);

          const form = document.createElement("ha-form");
          if (this._hass) form.hass = this._hass;

          const buildItemSchema = (positionMode) => {
            const schema = [
              { name: "entity", label: "Volet / store (cover)", required: true, selector: { entity: { domain: "cover" } } },
              {
                name: "cover_variant",
                label: "Type de store",
                selector: {
                  select: {
                    options: [
                      { label: "Store (classique)", value: "store" },
                      { label: "Store banne", value: "store_banne" },
                      { label: "Écran", value: "screen" },
                    ],
                    mode: "dropdown",
                  },
                },
              },
              {
                name: "position_mode",
                label: "Gestion de la position",
                selector: {
                  select: {
                    options: [
                      { label: "Native", value: "native" },
                      { label: "Calculée (Activhome)", value: "calculated" },
                      { label: "Aucune", value: "none" },
                    ],
                    mode: "dropdown",
                  },
                },
              },
            ];

            if (positionMode === "native") {
              schema.push({
                name: "state_mode",
                label: "Interprétation de l'état",
                selector: {
                  select: {
                    options: [
                      { label: "Normale", value: "normal" },
                      { label: "Inversée", value: "inverted" },
                    ],
                    mode: "dropdown",
                  },
                },
              });
            }

            schema.push(
              { name: "name", label: "Nom affiché (optionnel)", selector: { text: {} } },
            { name: "navigation_path", label: "Navigation path (optionnel)", selector: { text: {} } },
            { name: "tap_action", label: "Navigation (UI native, optionnel)", selector: { ui_action: {} } },
              {
                name: "font_size",
                label: "Taille police (optionnel)",
                selector: {
                  select: {
                    options: [
                      { label: "Par défaut (20)", value: "" },
                      { label: "16", value: "16px" },
                      { label: "17", value: "17px" },
                      { label: "18", value: "18px" },
                      { label: "19", value: "19px" },
                      { label: "20", value: "20px" },
                      { label: "21", value: "21px" },
                      { label: "22", value: "22px" },
                      { label: "23", value: "23px" },
                      { label: "24", value: "24px" },
                    ],
                    mode: "dropdown",
                  },
                },
              }
            );

            return schema;
          };

          const initialPositionMode = it.position_mode || "native";
          form.schema = buildItemSchema(initialPositionMode);

          form.data = {
            entity: it.entity || "",
            cover_variant: it.cover_variant || "store",
            position_mode: it.position_mode || "native",
            state_mode: it.state_mode || "normal",
            name: it.name || "",
            navigation_path: it.navigation_path || "",
            tap_action: it.tap_action || undefined,
            font_size: it.font_size || "",
          };

          form.addEventListener("value-changed", (ev) => {
            const v = ev.detail?.value || {};
            const current = Array.isArray(this._config.items) ? this._config.items : [];
            const next = { ...this._config, items: [...current] };

            const merged = { ...next.items[idx], ...v };

            // Clean empties in this item
            ["name", "navigation_path", "tap_action", "font_size", "cover_variant", "position_mode", "state_mode"].forEach((k) => {
              if (merged[k] === "" || merged[k] == null) delete merged[k];
            });

            // Keep YAML clean: store is default => omit cover_variant
            if ((merged.cover_variant || "store") === "store") delete merged.cover_variant;

            const selectedPositionMode = merged.position_mode || "native";

            // state_mode is only meaningful with native position mode.
            if (selectedPositionMode !== "native") delete merged.state_mode;

            // Native / normal are defaults => omit from YAML.
            if (selectedPositionMode === "native") delete merged.position_mode;
            if ((merged.state_mode || "normal") === "normal") delete merged.state_mode;

            next.items[idx] = merged;
            this._config = next;

            // Update this form schema immediately so state_mode appears only for Native.
            form.schema = buildItemSchema(selectedPositionMode);

            this._emit();

            // IMPORTANT: ne pas rebuild -> on met juste à jour sans casser le focus
            this._refreshItems();
          });

          wrap.appendChild(header);
          wrap.appendChild(form);
          host.appendChild(wrap);
        });

        return;
      }

      // --- 2) Sinon: pas de rebuild -> update des forms existants + boutons ---
      const cards = host.querySelectorAll(".itemCard");

      cards.forEach((card, idx) => {
        // Update header title (au cas où)
        const title = card.querySelector(".itemHeader > div");
        if (title) title.innerHTML = `<b>Item ${idx + 1}</b>`;

        // Update buttons state
        const buttons = card.querySelectorAll(".btnRow button");
        const up = buttons[0];
        const down = buttons[1];

        if (up) up.disabled = idx === 0;
        if (down) down.disabled = idx === items.length - 1;

        // Update form data, MAIS pas celui actuellement focus
        const form = card.querySelector("ha-form");
        if (!form) return;

        const isFocusedInside = focusedEl ? form.contains(focusedEl) : false;
        if (isFocusedInside) return;

        const it = items[idx] || {};
        const currentPositionMode = it.position_mode || "native";

        // Keep the editor schema coherent with the current position mode.
        const schema = Array.from(form.schema || []);
        const hasStateMode = schema.some((field) => field.name === "state_mode");

        if (currentPositionMode === "native" && !hasStateMode) {
          const insertAt = schema.findIndex((field) => field.name === "name");
          schema.splice(
            insertAt >= 0 ? insertAt : schema.length,
            0,
            {
              name: "state_mode",
              label: "Interprétation de l'état",
              selector: {
                select: {
                  options: [
                    { label: "Normale", value: "normal" },
                    { label: "Inversée", value: "inverted" },
                  ],
                  mode: "dropdown",
                },
              },
            }
          );
          form.schema = schema;
        } else if (currentPositionMode !== "native" && hasStateMode) {
          form.schema = schema.filter((field) => field.name !== "state_mode");
        }

        form.data = {
          entity: it.entity || "",
          cover_variant: it.cover_variant || "store",
          position_mode: currentPositionMode,
          state_mode: currentPositionMode === "native" ? (it.state_mode || "normal") : "normal",
          name: it.name || "",
          navigation_path: it.navigation_path || "",
          tap_action: it.tap_action || undefined,
          font_size: it.font_size || "",
        };
      });
    }
  }

  if (!customElements.get("activhome-cover-stack-v2")) {
    customElements.define("activhome-cover-stack-v2", ActivhomeCoverStack);
  }
  if (!customElements.get("activhome-cover-stack-v2-editor")) {
    customElements.define("activhome-cover-stack-v2-editor", ActivhomeCoverStackEditor);
  }

  window.customCards = window.customCards || [];
  if (!window.customCards.find((c) => c.type === "activhome-cover-stack-v2")) {
    window.customCards.push({
      type: "activhome-cover-stack-v2",
      name: "Activhome Cover Stack v2",
      description:
        "Stack vertical de volets/stores (icône SVG dynamique + nom + ouvrir/stop/fermer) avec style/thème sur le conteneur",
    });
  }
})();