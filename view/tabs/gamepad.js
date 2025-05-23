/**
 * SPDX-FileCopyrightText: 2024 Zeal 8-bit Computer <contact@zeal8bit.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

(() => {
  const haveEvents = "GamepadEvent" in window;
  const haveWebkitEvents = "WebKitGamepadEvent" in window;
  let adapter = null; // new SNESAdapter(zealcom, zealcom.pio);

  const Buttons = {
    B: -1,
    Y: -1,
    Select: -1,
    Start: -1,
    Up: -1,
    Down: -1,
    Left: -1,
    Right: -1,
    A: -1,
    X: -1,
    L: -1,
    R: -1,
    Unused1: -1,
    Unused2: -1,
    Unused3: -1,
    Unused4: -1,
  }

  if (haveEvents) {
    window.addEventListener("gamepadconnected", gamepadConnect);
    window.addEventListener("gamepaddisconnected", gamepadDisconnect);
  } else if (haveWebkitEvents) {
    window.addEventListener("webkitgamepadconnected", gamepadConnect);
    window.addEventListener("webkitgamepaddisconnected", gamepadDisconnect);
  } else {
    $("#gamepadview-start").text(
      "GamePad API is not supported in this browser, please use Chrome"
    );
  }

  let active = false;
  $("#gamepad").on("active", () => {
    active = true;
    requestAnimationFrame(gamepadTabUpdate);
  });

  $("#gamepad").on("inactive", () => {
    active = false;
  });

  $('#gamepadview-start .gamepad-clear-data').on('click', () => {
    console.log('clearing gamepad data');
    for(k of Object.keys(localStorage)) {
      try {
        const o = JSON.parse(localStorage.getItem(k));
        if(o.buttons?.B) {
          console.log('removing', k);
          localStorage.removeItem(k);
        }
      } catch(e) {}
    }
  })

  const gamePads = {};
  const mappings = {};
  const userPort = {};

  function attachToUserPort(gamepad) {
    const { index } = gamepad;
    if(!adapter) adapter = new SNESAdapter(zealcom, zealcom.pio);
    if(!adapter.attached()) adapter.attach();

    console.log('connect', index, gamepad.id);
    adapter.connect(index, mappings[gamepad.id]);
    $('#gamepad-tab .tab-status').text('🟢')
    updateGamepadMap(gamepad);
  }

  function detachFromUserPort(gamepad) {
    const { index } = gamepad;
    if(!adapter || !adapter.attached()) return;

    console.log('detach', index, gamepad.id);
    $('#gamepad-tab .tab-status').text('🔴')
    adapter.disconnect(index);
  }

  function updateGamepadMap(gamepad) {
    const { index } = gamepad;
    if(!adapter || !adapter.attached()) return;
    adapter.update(index, mappings);
  }

  function makeControllerButton(gamepad, container, buttonIndex) {
    const select = document.createElement('select');
    $(select).append($('<option value="-1">Ignore</option>')).attr({
      'button-index': buttonIndex,
    });
    for(let name in Buttons) {
      const option = document.createElement('option');
      if(mappings[gamepad.id].buttons[name] == buttonIndex) {
        $(option).attr('selected', true);
      }
      $(option).attr({
        value: Buttons[name],
      }).text(name);
      $(select).append(option);
    }
    $(container).append(select);
    $(select).addClass('button').on('change', (e) => {
      const $this = $(e.currentTarget);
      console.log('mapping', buttonIndex, $this.val());
      $('#gamepad-save-map').addClass('alert');
      if(mappings[gamepad.id]) {
        const label = $('option:selected', $this).text();
        mappings[gamepad.id].buttons[label] = buttonIndex;
      }
      console.log('mapping', mappings[gamepad.id]);
      updateGamepadMap(gamepad);
    });
  }

  function makeControllerContainer(gamepad) {
    const { index } = gamepad;
    const id = `controller${index}`;

    // get stored or create default mapping
    mappings[gamepad.id] = (() => {
      const map = JSON.parse(localStorage.getItem(gamepad.id) ?? 'null');
      if(map && map.port === undefined) map.port = 0;
      return map ?? Object.assign({}, {
        port: 0,
        attach: false,
        buttons: Buttons
      });
    })();

    // div.controller
    const details = document.createElement("div");
    $(details).attr({
      id,
    }).addClass('controller');

    // div.toolbar
    const toolbar = document.createElement("div");
    $(toolbar).addClass('toolbar');
    $(details).append(toolbar);

    // button attach()
    const attachButton = document.createElement("button");
    $(attachButton).text('Attach').on('click', () => {
      attachToUserPort(gamepad);
      $(attachButton).attr('disabled', true);
    });
    $(toolbar).append(attachButton);

    if(mappings[gamepad.id].attach) {
      // attachToUserPort(gamepad);
      $(attachButton).trigger('click');
    }

    // button detach()
    const detatchButton = document.createElement("button");
    $(detatchButton).text('Detach').on('click', () => {
      detachFromUserPort(gamepad);
      $(attachButton).removeAttr('disabled');
    });
    $(toolbar).append(detatchButton);

    // button saveMap()
    const saveMapButton = document.createElement("button");
    $(saveMapButton).attr({
      id: 'gamepad-save-map',
    }).text('Save Map').on('click', () => {
      console.log('saveMap', index, gamepad.id);
      if(mappings[gamepad.id]) {
        const map = mappings[gamepad.id];
        console.log('saveMap', gamepad.id, map);
        localStorage.setItem(gamepad.id, JSON.stringify(map));
        $(saveMapButton).removeClass('alert');
      }
    });
    $(toolbar).append(saveMapButton);

    // input.checkbox autoAttach
    const autoAttachLabel = document.createElement('label');
    $(autoAttachLabel).text('Auto Attach');
    const autoAttachCheckbox = document.createElement('input');
    $(autoAttachCheckbox).attr({
      type: 'checkbox',
      checked: mappings[gamepad.id].attach ?? false,
    }).on('change', (e) => {
      if(mappings[gamepad.id]) {
        mappings[gamepad.id].attach = $(e.currentTarget).is(':checked');
      }
      console.log('map', mappings[gamepad.id]);
    });
    $(autoAttachLabel).append(autoAttachCheckbox);
    $(toolbar).append(autoAttachLabel);

    // input.number portNumber
    const portNumberLabel = document.createElement('label');
    $(portNumberLabel).text('Port');
    const portNumberInput = document.createElement('input');
    $(portNumberInput).attr({
      type: 'number',
      min: 0,
      max: 1,
      value: mappings[gamepad.id].port ?? gamepad.index,
    }).on('change', (e) => {
      if(mappings[gamepad.id]) {
        mappings[gamepad.id].port = parseInt($(e.currentTarget).val());
      }
    });
    $(portNumberLabel).append(portNumberInput);
    $(toolbar).append(portNumberLabel);

    // h1
    const title = document.createElement("h1");
    $(title).text(gamepad.id);
    $(details).append(title);

    // div.buttons
    const buttons = document.createElement("div");
    buttons.className = "buttons";
    $(buttons).append('<h2>Buttons</h2>');
    for (let i = 0; i < gamepad.buttons.length; i++) {
      makeControllerButton(gamepad, buttons, i);
    }
    $(details).append(buttons);

    // div.axes
    const axes = document.createElement("div");
    axes.className = "axes";
    $(axes).append('<h2>Axes</h2>');
    for (i = 0; i < gamepad.axes.length; i++) {
      const buttonIndex = ((i + 1) * 2) + 64; // virtual button
      makeControllerButton(gamepad, axes, buttonIndex);
      makeControllerButton(gamepad, axes, buttonIndex-1);
    }
    $(details).append(axes);

    // Credit: https://commons.wikimedia.org/wiki/File:SNES_controller.svg
    const svg = document.createElement('div');
    $(svg).attr({
      id: `${id}-svg`
    }).addClass('svg').load('./imgs/snes-controller.svg');
    $(details).append(svg);

    return details;
  }

  function gamepadConnect(e) {
    const { gamepad } = e;
    const { index } = gamepad;
    gamePads[index] = gamepad;
    const d = makeControllerContainer(gamepad);
    $("#gamepadview-start").css({ display: "none" });
    $("#gamepadview").removeClass("empty").append(d);
  }

  function gamepadDisconnect(e) {
    const { gamepad } = e;
    const d = document.getElementById("controller" + gamepad.index);
    document.body.removeChild(d);
    delete gamePads[gamepad.index];
  }

  function gamepadTabUpdateVisual(gamepadId, controllerIndex, buttonIndex, pressed) {
    if(mappings[gamepadId]) {
      const map = mappings[gamepadId].buttons;
      // lookup mapping
      for(button in map) {
        if(map[button] == buttonIndex) {
          const $svg = $(`#controller${controllerIndex}-svg svg`);
          const $svgButton = $svg.find(`.svg-button-${button.toLowerCase()}`);
          if(pressed) {
            $svgButton.addClass('pressed');
          } else {
            $svgButton.removeClass('pressed');
          }
        }
      }
    }
  }

  function gamepadTabUpdate() {
    const gamePads = navigator.getGamepads() ?? [];
    for (j = 0; j < gamePads.length; j++) {
      const gamepad = gamePads[j];
      if(!gamepad) continue;

      const $d = $(`#controller${j}`);
      if(!$d.length) continue;

      const $controller = $(`#controller${j}`);
      for (let i = 0; i < gamepad.buttons.length; i++) {
        const $button = $(`.buttons .button[button-index=${i}]`, $controller);
        let val = gamepad.buttons[i];
        let pressed = val == 1.0;
        let touched = false;
        if (typeof val == "object") {
          pressed = val.pressed;
          if ("touched" in val) {
            touched = val.touched;
          }
          val = val.value;
        }
        const pct = Math.round(val * 100) + "%";
        $button.css({
          backgroundSize: pct + ' ' + pct,
        }).addClass('button');
        if (pressed) {
          $button.addClass('pressed');
        } else {
          $button.removeClass('pressed');
        }
        if (touched) {
          $button.addClass('touched');
        } else {
          $button.removeClass('touched');
        }

        gamepadTabUpdateVisual(gamepad.id, j, i, pressed || touched);
      }

      for (let i = 0; i < gamepad.axes.length; i++) {
        const buttonIndex = ((i + 1) * 2) + 64; // virtual button
        const value = gamepad.axes[i];
        // console.log(typeof value, value, buttonIndex);
        const $button1 = $(`.axes .button[button-index=${buttonIndex-1}]`).removeClass('pressed');
        const $button2 = $(`.axes .button[button-index=${buttonIndex}]`).removeClass('pressed');
        gamepadTabUpdateVisual(gamepad.id, j, buttonIndex - 1, false);
        gamepadTabUpdateVisual(gamepad.id, j, buttonIndex, false);
        if(value > 0.25) {
          $button1.addClass('pressed');
          gamepadTabUpdateVisual(gamepad.id, j, buttonIndex - 1, true);
        } else if(value < -0.25) {
          $button2.addClass('pressed');
          gamepadTabUpdateVisual(gamepad.id, j, buttonIndex, true);
        }

      }
    }
    if(active) requestAnimationFrame(gamepadTabUpdate);
  }
})();