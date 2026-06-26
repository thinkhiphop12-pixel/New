"use strict";

var Iodine = null;
var Blitter = null;
var Mixer = null;
var MixerInput = null;
var romLoaded = false;
var biosLoaded = false;
var isPaused = false;

function initEmulatorCore() {
  Iodine = new GameBoyAdvanceEmulator();
  Iodine.settings.SKIPBoot = true;
  Blitter = new GlueCodeGfx();
  Blitter.attachCanvas(document.getElementById("emulator_target"));
  Blitter.setSmoothScaling(false);
  Iodine.attachGraphicsFrameHandler(function (buffer) { Blitter.copyBuffer(buffer); });
  Mixer = new GlueCodeMixer();
  MixerInput = new GlueCodeMixerInput(Mixer);
  Iodine.attachAudioHandler(MixerInput);
  Iodine.attachSaveExportHandler(ExportSaveCallback);
  Iodine.attachSaveImportHandler(ImportSaveCallback);
  Iodine.enableAudio();
}

function loadBiosFile(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onloadend = function () {
    if (!Iodine) initEmulatorCore();
    attachBIOS(this.result);
    biosLoaded = true;
    document.getElementById("retroStep1").classList.add("retro-step-done");
    document.getElementById("retroStep2").classList.remove("retro-step-dim");
    var romLabel = document.getElementById("romInputLabel");
    romLabel.classList.remove("retro-step-dim");
    document.getElementById("romInput").disabled = false;
  };
  reader.readAsArrayBuffer(file);
}

function loadRomFile(file) {
  if (!file || !biosLoaded) return;
  var reader = new FileReader();
  reader.onloadend = function () {
    attachROM(this.result);
    Iodine.play();
    romLoaded = true;
    isPaused = false;
    document.getElementById("retroOverlay").style.display = "none";
    document.getElementById("btnPause").disabled = false;
    document.getElementById("btnReset").disabled = false;
    document.getElementById("btnPause").textContent = "Pause";
    document.title = file.name.replace(/\.gba$/i, "") + " — Retro Player | Ball Knowledge";
  };
  reader.readAsArrayBuffer(file);
}

function wireFileInputs() {
  document.getElementById("biosInput").addEventListener("change", function () {
    if (this.files && this.files.length) loadBiosFile(this.files[0]);
  });
  ["romInput", "romInputSwap"].forEach(function (id) {
    var input = document.getElementById(id);
    input.addEventListener("change", function () {
      if (this.files && this.files.length) loadRomFile(this.files[0]);
    });
  });
}

function wireToolbar() {
  document.getElementById("btnPause").addEventListener("click", function () {
    if (!Iodine || !romLoaded) return;
    isPaused = !isPaused;
    if (isPaused) { Iodine.pause(); this.textContent = "Resume"; }
    else { Iodine.play(); this.textContent = "Pause"; }
  });
  document.getElementById("btnReset").addEventListener("click", function () {
    if (Iodine && romLoaded) Iodine.reset();
  });
  document.getElementById("btnVolUp").addEventListener("click", function () {
    if (Iodine) Iodine.incrementVolume(0.1);
  });
  document.getElementById("btnVolDown").addEventListener("click", function () {
    if (Iodine) Iodine.incrementVolume(-0.1);
  });
}

function lowerVolume() { if (Iodine) Iodine.incrementVolume(-0.04); }
function raiseVolume() { if (Iodine) Iodine.incrementVolume(0.04); }

var tempMsgTimer = null;
function showTempString(text) {
  var el = document.getElementById("tempMessage");
  el.style.display = "block";
  el.textContent = text;
}
function clearTempString() {
  document.getElementById("tempMessage").style.display = "none";
}
function writeRedTemporaryText(text) {
  if (tempMsgTimer) clearTimeout(tempMsgTimer);
  showTempString(text);
  tempMsgTimer = setTimeout(clearTempString, 5000);
}

var TOUCH_KEY_INDEX = { a: 0, b: 1, select: 2, start: 3, right: 4, left: 5, up: 6, down: 7, r: 8, l: 9 };

function wireTouchPad() {
  var pad = document.getElementById("retroPad");
  var buttons = pad.querySelectorAll("[data-key]");
  buttons.forEach(function (btn) {
    var idx = TOUCH_KEY_INDEX[btn.getAttribute("data-key")];
    var press = function (e) { e.preventDefault(); if (Iodine) Iodine.keyDown(idx); btn.classList.add("active"); };
    var release = function (e) { if (e) e.preventDefault(); if (Iodine) Iodine.keyUp(idx); btn.classList.remove("active"); };
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release);
    btn.addEventListener("touchcancel", release);
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
  });
}

function boot() {
  wireFileInputs();
  wireToolbar();
  wireTouchPad();
  document.addEventListener("keydown", keyDown);
  document.addEventListener("keyup", keyUpPreprocess);
  window.addEventListener("unload", function () { if (Iodine && romLoaded) ExportSave(); });
}

document.addEventListener("DOMContentLoaded", boot);
