/*
  Haptics.
  - Android and other browsers with the Vibration API: navigator.vibrate patterns.
  - iPhone Safari has no Vibration API. A tap on a <label> wired to <input type="checkbox" switch>
    makes iOS (17.4+) fire its own haptic. attach(el) puts a clear label over a tappable element so
    the player's real tap triggers it. On iOS before 26.5 a scripted label click also works, so
    pulse() can fire haptics for things like a brick landing.
*/
(function (root) {
  const NS = root.STRINGLINE = root.STRINGLINE || {};
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const m = ua.match(/OS (\d+)[_.](\d+)/);
  const iosVersion = m ? parseFloat(m[1] + "." + m[2]) : 0;
  const canScript = isIOS && iosVersion > 0 && iosVersion < 26.5;
  const canVibrate = !isIOS && typeof navigator.vibrate === "function";
  let enabled = true;
  const switches = [];
  let scripted = null;

  function makeSwitch() {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    Object.assign(input.style, { position: "absolute", width: "1px", height: "1px", margin: "0", opacity: "0", pointerEvents: "none" });
    input.addEventListener("click", function (e) { e.stopPropagation(); });
    switches.push(input);
    input.disabled = !enabled;
    return input;
  }

  // Lay a clear label over el. Taps still reach el's own listeners because the label is its child.
  function attach(el) {
    // Older iOS uses scripted ticks for everything, so an overlay would double up.
    if (!isIOS || canScript || !el || el.querySelector(":scope > .haptic-hit")) return;
    const label = document.createElement("label");
    label.className = "haptic-hit";
    label.setAttribute("aria-hidden", "true");
    label.appendChild(makeSwitch());
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.appendChild(label);
  }

  function scriptedTick() {
    if (!scripted) {
      const label = document.createElement("label");
      label.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-10px;top:-10px";
      label.appendChild(makeSwitch());
      document.body.appendChild(label);
      scripted = label;
    }
    scripted.click();
  }

  // pattern: ms number or [on, off, on, ...] like navigator.vibrate.
  function pulse(pattern) {
    if (!enabled) return;
    if (canVibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
      return;
    }
    if (canScript) {
      const list = Array.isArray(pattern) ? pattern : [pattern];
      let t = 0;
      for (let i = 0; i < list.length; i += 2) {
        setTimeout(scriptedTick, t);
        t += (list[i] || 0) + (list[i + 1] || 0);
      }
    }
  }

  function setEnabled(on) {
    enabled = !!on;
    switches.forEach(function (s) { s.disabled = !enabled; });
  }

  NS.haptics = {
    attach: attach,
    pulse: pulse,
    setEnabled: setEnabled,
    isIOS: isIOS,
    // True when a tap on an attached element already gave a haptic, so pulse should not repeat it.
    tapCovered: isIOS && !canScript,
    supported: canVibrate || isIOS
  };
})(typeof window !== "undefined" ? window : globalThis);
