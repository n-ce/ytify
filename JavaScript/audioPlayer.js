(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.GreenAudioPlayer = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

module.exports = require('./src/js/main').default;

},{"./src/js/main":2}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var GreenAudioPlayer = /*#__PURE__*/function () {
  function GreenAudioPlayer(player, options) {
    _classCallCheck(this, GreenAudioPlayer);

    this.audioPlayer = typeof player === 'string' ? document.querySelector(player) : player;
    var opts = options || {};
    var audioElement = this.audioPlayer.innerHTML;
    this.audioPlayer.classList.add('green-audio-player');
    this.audioPlayer.innerHTML = GreenAudioPlayer.getTemplate() + audioElement;
    this.isDevice = /ipad|iphone|ipod|android/i.test(window.navigator.userAgent.toLowerCase()) && !window.MSStream;
    this.playPauseBtn = this.audioPlayer.querySelector('.play-pause-btn');
    this.loading = this.audioPlayer.querySelector('.loading');
    this.sliders = this.audioPlayer.querySelectorAll('.slider');
    this.progress = this.audioPlayer.querySelector('.controls__progress');
    this.volumeBtn = this.audioPlayer.querySelector('.volume__button');
    this.volumeControls = this.audioPlayer.querySelector('.volume__controls');
    this.volumeProgress = this.volumeControls.querySelector('.volume__progress');
    this.player = this.audioPlayer.querySelector('audio');
    this.currentTime = this.audioPlayer.querySelector('.controls__current-time');
    this.totalTime = this.audioPlayer.querySelector('.controls__total-time');
    this.speaker = this.audioPlayer.querySelector('.volume__speaker');
    this.download = this.audioPlayer.querySelector('.download');
    this.downloadLink = this.audioPlayer.querySelector('.download__link');
    this.span = this.audioPlayer.querySelectorAll('.message__offscreen');
    this.svg = this.audioPlayer.getElementsByTagName('svg');
    this.img = this.audioPlayer.getElementsByTagName('img');
    this.draggableClasses = ['pin'];
    this.currentlyDragged = null;
    this.stopOthersOnPlay = opts.stopOthersOnPlay || false;
    this.enableKeystrokes = opts.enableKeystrokes || false;
    this.showTooltips = opts.showTooltips || false;
    var self = this;
    this.labels = {
      volume: {
        open: 'Open Volume Controls',
        close: 'Close Volume Controls'
      },
      pause: 'Pause',
      play: 'Play',
      download: 'Download'
    };

    if (!this.enableKeystrokes) {
      for (var i = 0; i < this.span.length; i++) {
        this.span[i].outerHTML = '';
      }
    } else {
      window.addEventListener('keydown', this.pressKb.bind(self), false);
      window.addEventListener('keyup', this.unPressKb.bind(self), false);
      this.sliders[0].setAttribute('tabindex', 0);
      this.sliders[1].setAttribute('tabindex', 0);
      this.download.setAttribute('tabindex', -1);
      this.downloadLink.setAttribute('tabindex', -1);

      for (var j = 0; j < this.svg.length; j++) {
        this.svg[j].setAttribute('tabindex', 0);
        this.svg[j].setAttribute('focusable', true);
      }

      for (var k = 0; k < this.img.length; k++) {
        this.img[k].setAttribute('tabindex', 0);
      }
    }

    if (this.showTooltips) {
      this.playPauseBtn.setAttribute('title', this.labels.play);
      this.volumeBtn.setAttribute('title', this.labels.volume.open);
      this.downloadLink.setAttribute('title', this.labels.download);
    }

    if (opts.outlineControls || false) {
      this.audioPlayer.classList.add('player-accessible');
    }

    if (opts.showDownloadButton || false) {
      this.showDownload();
    }

    this.initEvents();
    this.directionAware();
    this.overcomeIosLimitations();

    if ('autoplay' in this.player.attributes) {
      var promise = this.player.play();

      if (promise !== undefined) {
        promise.then(function () {
          var playPauseButton = self.player.parentElement.querySelector('.play-pause-btn__icon');
          playPauseButton.attributes.d.value = 'M0 0h6v24H0zM12 0h6v24h-6z';
          self.playPauseBtn.setAttribute('aria-label', self.labels.pause);
          self.hasSetAttribute(self.playPauseBtn, 'title', self.labels.pause);
        }).catch(function () {
          // eslint-disable-next-line no-console
          console.error('Green Audio Player Error: Autoplay has been prevented, because it is not allowed by this browser.');
        });
      }
    }

    if ('preload' in this.player.attributes && this.player.attributes.preload.value === 'none') {
      this.playPauseBtn.style.visibility = 'visible';
      this.loading.style.visibility = 'hidden';
    }
  }

  _createClass(GreenAudioPlayer, [{
    key: "initEvents",
    value: function initEvents() {
      var self = this;
      self.audioPlayer.addEventListener('mousedown', function (event) {
        if (self.isDraggable(event.target)) {
          self.currentlyDragged = event.target;
          var handleMethod = self.currentlyDragged.dataset.method;
          var listener = self[handleMethod].bind(self);
          window.addEventListener('mousemove', listener, false);

          if (self.currentlyDragged.parentElement.parentElement === self.sliders[0]) {
            self.paused = self.player.paused;
            if (self.paused === false) self.togglePlay();
          }

          window.addEventListener('mouseup', function () {
            if (self.currentlyDragged !== false && self.currentlyDragged.parentElement.parentElement === self.sliders[0] && self.paused !== self.player.paused) {
              self.togglePlay();
            }

            self.currentlyDragged = false;
            window.removeEventListener('mousemove', listener, false);
          }, false);
        }
      }); // for mobile touches

      self.audioPlayer.addEventListener('touchstart', function (event) {
        if (self.isDraggable(event.target)) {
          var _event$targetTouches = _slicedToArray(event.targetTouches, 1);

          self.currentlyDragged = _event$targetTouches[0];
          var handleMethod = self.currentlyDragged.target.dataset.method;
          var listener = self[handleMethod].bind(self);
          window.addEventListener('touchmove', listener, false);

          if (self.currentlyDragged.parentElement.parentElement === self.sliders[0]) {
            self.paused = self.player.paused;
            if (self.paused === false) self.togglePlay();
          }

          window.addEventListener('touchend', function () {
            if (self.currentlyDragged !== false && self.currentlyDragged.parentElement.parentElement === self.sliders[0] && self.paused !== self.player.paused) {
              self.togglePlay();
            }

            self.currentlyDragged = false;
            window.removeEventListener('touchmove', listener, false);
          }, false);
          event.preventDefault();
        }
      });
      this.playPauseBtn.addEventListener('click', this.togglePlay.bind(self));
      this.player.addEventListener('timeupdate', this.updateProgress.bind(self));
      this.player.addEventListener('volumechange', this.updateVolume.bind(self));
      this.player.volume = 0.81;
      this.player.addEventListener('loadedmetadata', function () {
        self.totalTime.textContent = GreenAudioPlayer.formatTime(self.player.duration);
      });
      this.player.addEventListener('seeking', this.showLoadingIndicator.bind(self));
      this.player.addEventListener('seeked', this.hideLoadingIndicator.bind(self));
      this.player.addEventListener('canplay', this.hideLoadingIndicator.bind(self));
      this.player.addEventListener('ended', function () {
        GreenAudioPlayer.pausePlayer(self.player, 'ended');
        self.player.currentTime = 0;
        self.playPauseBtn.setAttribute('aria-label', self.labels.play);
        self.hasSetAttribute(self.playPauseBtn, 'title', self.labels.play);
      });
      this.volumeBtn.addEventListener('click', this.showHideVolume.bind(self));
      window.addEventListener('resize', self.directionAware.bind(self));
      window.addEventListener('scroll', self.directionAware.bind(self));

      for (var i = 0; i < this.sliders.length; i++) {
        var pin = this.sliders[i].querySelector('.pin');
        this.sliders[i].addEventListener('click', self[pin.dataset.method].bind(self));
      }

      this.downloadLink.addEventListener('click', this.downloadAudio.bind(self));
    }
  }, {
    key: "overcomeIosLimitations",
    value: function overcomeIosLimitations() {
      var self = this;

      if (this.isDevice) {
        // iOS does not support "canplay" event
        this.player.addEventListener('loadedmetadata', this.hideLoadingIndicator.bind(self)); // iOS does not let "volume" property to be set programmatically

        this.audioPlayer.querySelector('.volume').style.display = 'none';
        this.audioPlayer.querySelector('.controls').style.marginRight = '0';
      }
    }
  }, {
    key: "isDraggable",
    value: function isDraggable(el) {
      var canDrag = false;
      if (typeof el.classList === 'undefined') return false; // fix for IE 11 not supporting classList on SVG elements

      for (var i = 0; i < this.draggableClasses.length; i++) {
        if (el.classList.contains(this.draggableClasses[i])) {
          canDrag = true;
        }
      }

      return canDrag;
    }
  }, {
    key: "inRange",
    value: function inRange(event) {
      var touch = 'touches' in event; // instanceof TouchEvent may also be used

      var rangeBox = this.getRangeBox(event);
      var sliderPositionAndDimensions = rangeBox.getBoundingClientRect();
      var direction = rangeBox.dataset.direction;
      var min = null;
      var max = null;

      if (direction === 'horizontal') {
        min = sliderPositionAndDimensions.x;
        max = min + sliderPositionAndDimensions.width;
        var clientX = touch ? event.touches[0].clientX : event.clientX;
        if (clientX < min || clientX > max) return false;
      } else {
        min = sliderPositionAndDimensions.top;
        max = min + sliderPositionAndDimensions.height;
        var clientY = touch ? event.touches[0].clientY : event.clientY;
        if (clientY < min || clientY > max) return false;
      }

      return true;
    }
  }, {
    key: "updateProgress",
    value: function updateProgress() {
      var current = this.player.currentTime;
      var percent = current / this.player.duration * 100;
      this.progress.setAttribute('aria-valuenow', percent);
      this.progress.style.width = "".concat(percent, "%");
      this.currentTime.textContent = GreenAudioPlayer.formatTime(current);
    }
  }, {
    key: "updateVolume",
    value: function updateVolume() {
      this.volumeProgress.setAttribute('aria-valuenow', this.player.volume * 100);
      this.volumeProgress.style.height = "".concat(this.player.volume * 100, "%");

      if (this.player.volume >= 0.5) {
        this.speaker.attributes.d.value = 'M14.667 0v2.747c3.853 1.146 6.666 4.72 6.666 8.946 0 4.227-2.813 7.787-6.666 8.934v2.76C20 22.173 24 17.4 24 11.693 24 5.987 20 1.213 14.667 0zM18 11.693c0-2.36-1.333-4.386-3.333-5.373v10.707c2-.947 3.333-2.987 3.333-5.334zm-18-4v8h5.333L12 22.36V1.027L5.333 7.693H0z';
      } else if (this.player.volume < 0.5 && this.player.volume > 0.05) {
        this.speaker.attributes.d.value = 'M0 7.667v8h5.333L12 22.333V1L5.333 7.667M17.333 11.373C17.333 9.013 16 6.987 14 6v10.707c2-.947 3.333-2.987 3.333-5.334z';
      } else if (this.player.volume <= 0.05) {
        this.speaker.attributes.d.value = 'M0 7.667v8h5.333L12 22.333V1L5.333 7.667';
      }
    }
  }, {
    key: "getRangeBox",
    value: function getRangeBox(event) {
      var rangeBox = event.target;
      var el = this.currentlyDragged;

      if (event.type === 'click' && this.isDraggable(event.target)) {
        rangeBox = event.target.parentElement.parentElement;
      }

      if (event.type === 'mousemove') {
        rangeBox = el.parentElement.parentElement;
      }

      if (event.type === 'touchmove') {
        rangeBox = el.target.parentElement.parentElement;
      }

      return rangeBox;
    }
  }, {
    key: "getCoefficient",
    value: function getCoefficient(event) {
      var touch = 'touches' in event; // instanceof TouchEvent may also be used

      var slider = this.getRangeBox(event);
      var sliderPositionAndDimensions = slider.getBoundingClientRect();
      var K = 0;

      if (slider.dataset.direction === 'horizontal') {
        // if event is touch
        var clientX = touch ? event.touches[0].clientX : event.clientX;
        var offsetX = clientX - sliderPositionAndDimensions.left;
        var width = sliderPositionAndDimensions.width;
        K = offsetX / width;
      } else if (slider.dataset.direction === 'vertical') {
        var height = sliderPositionAndDimensions.height;
        var clientY = touch ? event.touches[0].clientY : event.clientY;
        var offsetY = clientY - sliderPositionAndDimensions.top;
        K = 1 - offsetY / height;
      }

      return K;
    }
  }, {
    key: "rewind",
    value: function rewind(event) {
      if (this.player.seekable && this.player.seekable.length) {
        // no seek if not (pre)loaded
        if (this.inRange(event)) {
          this.player.currentTime = this.player.duration * this.getCoefficient(event);
        }
      }
    }
  }, {
    key: "showVolume",
    value: function showVolume() {
      if (this.volumeBtn.getAttribute('aria-attribute') === this.labels.volume.open) {
        this.volumeControls.classList.remove('hidden');
        this.volumeBtn.classList.add('open');
        this.volumeBtn.setAttribute('aria-label', this.labels.volume.close);
        this.hasSetAttribute(this.volumeBtn, 'title', this.labels.volume.close);
      }
    }
  }, {
    key: "showHideVolume",
    value: function showHideVolume() {
      this.volumeControls.classList.toggle('hidden');

      if (this.volumeBtn.getAttribute('aria-label') === this.labels.volume.open) {
        this.volumeBtn.setAttribute('aria-label', this.labels.volume.close);
        this.hasSetAttribute(this.volumeBtn, 'title', this.labels.volume.close);
        this.volumeBtn.classList.add('open');
      } else {
        this.volumeBtn.setAttribute('aria-label', this.labels.volume.open);
        this.hasSetAttribute(this.volumeBtn, 'title', this.labels.volume.open);
        this.volumeBtn.classList.remove('open');
      }
    }
  }, {
    key: "changeVolume",
    value: function changeVolume(event) {
      if (this.inRange(event)) {
        this.player.volume = Math.round(this.getCoefficient(event) * 50) / 50;
      }
    }
  }, {
    key: "preloadNone",
    value: function preloadNone() {
      var self = this;

      if (!this.player.duration) {
        self.playPauseBtn.style.visibility = 'hidden';
        self.loading.style.visibility = 'visible';
      }
    }
  }, {
    key: "togglePlay",
    value: function togglePlay() {
      this.preloadNone();

      if (this.player.paused) {
        if (this.stopOthersOnPlay) {
          GreenAudioPlayer.stopOtherPlayers();
        }

        GreenAudioPlayer.playPlayer(this.player);
        this.playPauseBtn.setAttribute('aria-label', this.labels.pause);
        this.hasSetAttribute(this.playPauseBtn, 'title', this.labels.pause);
      } else {
        GreenAudioPlayer.pausePlayer(this.player, 'toggle');
        this.playPauseBtn.setAttribute('aria-label', this.labels.play);
        this.hasSetAttribute(this.playPauseBtn, 'title', this.labels.play);
      }
    }
  }, {
    key: "hasSetAttribute",
    value: function hasSetAttribute(el, a, v) {
      if (this.showTooltips) {
        if (el.hasAttribute(a)) {
          el.setAttribute(a, v);
        }
      }
    }
  }, {
    key: "setCurrentTime",
    value: function setCurrentTime(time) {
      var pos = this.player.currentTime;
      var end = Math.floor(this.player.duration);

      if (pos + time < 0 && pos === 0) {
        this.player.currentTime = this.player.currentTime;
      } else if (pos + time < 0) {
        this.player.currentTime = 0;
      } else if (pos + time > end) {
        this.player.currentTime = end;
      } else {
        this.player.currentTime += time;
      }
    }
  }, {
    key: "setVolume",
    value: function setVolume(volume) {
      if (this.isDevice) return;
      var vol = this.player.volume;

      if (vol + volume >= 0 && vol + volume < 1) {
        this.player.volume += volume;
      } else if (vol + volume <= 0) {
        this.player.volume = 0;
      } else {
        this.player.volume = 1;
      }
    }
  }, {
    key: "unPressKb",
    value: function unPressKb(event) {
      var evt = event || window.event;

      if (this.seeking && (evt.keyCode === 37 || evt.keyCode === 39)) {
        this.togglePlay();
        this.seeking = false;
      }
    }
  }, {
    key: "pressKb",
    value: function pressKb(event) {
      var evt = event || window.event;

      switch (evt.keyCode) {
        case 13: // Enter

        case 32:
          // Spacebar
          if (document.activeElement.parentNode === this.playPauseBtn) {
            this.togglePlay();
          } else if (document.activeElement.parentNode === this.volumeBtn || document.activeElement === this.sliders[1]) {
            if (document.activeElement === this.sliders[1]) {
              try {
                // IE 11 not supporting programmatic focus on svg elements
                this.volumeBtn.children[0].focus();
              } catch (error) {
                this.volumeBtn.focus();
              }
            }

            this.showHideVolume();
          }

          if (evt.keyCode === 13 && this.showDownload && document.activeElement.parentNode === this.downloadLink) {
            this.downloadLink.focus();
          }

          break;

        case 37:
        case 39:
          // horizontal Arrows
          if (document.activeElement === this.sliders[0]) {
            if (evt.keyCode === 37) {
              this.setCurrentTime(-5);
            } else {
              this.setCurrentTime(+5);
            }

            if (!this.player.paused && this.player.seeking) {
              this.togglePlay();
              this.seeking = true;
            }
          }

          break;

        case 38:
        case 40:
          // vertical Arrows
          if (document.activeElement.parentNode === this.volumeBtn || document.activeElement === this.sliders[1]) {
            if (evt.keyCode === 38) {
              this.setVolume(0.05);
            } else {
              this.setVolume(-0.05);
            }
          }

          if (document.activeElement.parentNode === this.volumeBtn) {
            this.showVolume();
          }

          break;

        default:
          break;
      }
    }
  }, {
    key: "showLoadingIndicator",
    value: function showLoadingIndicator() {
      this.playPauseBtn.style.visibility = 'hidden';
      this.loading.style.visibility = 'visible';
    }
  }, {
    key: "hideLoadingIndicator",
    value: function hideLoadingIndicator() {
      this.playPauseBtn.style.visibility = 'visible';
      this.loading.style.visibility = 'hidden';
    }
  }, {
    key: "showDownload",
    value: function showDownload() {
      this.download.style.display = 'block';
    }
  }, {
    key: "downloadAudio",
    value: function downloadAudio() {
      var src = this.player.currentSrc;
      var name = src.split('/').reverse()[0];
      this.downloadLink.setAttribute('href', src);
      this.downloadLink.setAttribute('download', name);
    }
  }, {
    key: "directionAware",
    value: function directionAware() {
      this.volumeControls.classList.remove('top', 'middle', 'bottom');

      if (window.innerHeight < 250) {
        this.volumeControls.classList.add('middle');
      } else if (this.audioPlayer.getBoundingClientRect().top < 180) {
        this.volumeControls.classList.add('bottom');
      } else {
        this.volumeControls.classList.add('top');
      }
    }
  }], [{
    key: "init",
    value: function init(options) {
      var players = document.querySelectorAll(options.selector);
      players.forEach(function (player) {
        /* eslint-disable no-new */
        new GreenAudioPlayer(player, options);
      });
    }
  }, {
    key: "getTemplate",
    value: function getTemplate() {
      return "\n            <div class=\"holder\">\n                <div class=\"loading\">\n                    <div class=\"loading__spinner\"></div>\n                </div>\n\n                <div class=\"play-pause-btn\" aria-label=\"Play\" role=\"button\">\n                    <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"24\" viewBox=\"0 0 18 24\">\n                        <path fill=\"#566574\" fill-rule=\"evenodd\" d=\"M18 12L0 24V0\" class=\"play-pause-btn__icon\"/>\n                    </svg>\n                </div>\n            </div>\n\n            <div class=\"controls\">\n                <span class=\"controls__current-time\" aria-live=\"off\" role=\"timer\">00:00</span>\n                <div class=\"controls__slider slider\" data-direction=\"horizontal\">\n                    <div class=\"controls__progress gap-progress\" aria-label=\"Time Slider\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"0\" role=\"slider\">\n                        <div class=\"pin progress__pin\" data-method=\"rewind\"></div>\n                    </div>\n                </div>\n                <span class=\"controls__total-time\">00:00</span>\n            </div>\n\n            <div class=\"volume\">\n                <div class=\"volume__button\" aria-label=\"Open Volume Controls\" role=\"button\">\n                    <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">\n                        <path class=\"volume__speaker\" fill=\"#566574\" fill-rule=\"evenodd\" d=\"M14.667 0v2.747c3.853 1.146 6.666 4.72 6.666 8.946 0 4.227-2.813 7.787-6.666 8.934v2.76C20 22.173 24 17.4 24 11.693 24 5.987 20 1.213 14.667 0zM18 11.693c0-2.36-1.333-4.386-3.333-5.373v10.707c2-.947 3.333-2.987 3.333-5.334zm-18-4v8h5.333L12 22.36V1.027L5.333 7.693H0z\"/>\n                    </svg>\n                    <span class=\"message__offscreen\">Press Enter or Space to show volume slider.</span>\n                </div>\n                <div class=\"volume__controls hidden\">\n                    <div class=\"volume__slider slider\" data-direction=\"vertical\">\n                        <div class=\"volume__progress gap-progress\" aria-label=\"Volume Slider\" aria-valuemin=\"0\" aria-valuemax=\"100\" aria-valuenow=\"81\" role=\"slider\">\n                            <div class=\"pin volume__pin\" data-method=\"changeVolume\"></div>\n                        </div>\n                        <span class=\"message__offscreen\">Use Up/Down Arrow keys to increase or decrease volume.</span>\n                    </div>\n                </div>\n            </div>\n\n            <div class=\"download\">\n                <a class=\"download__link\" href=\"\" download=\"\" aria-label=\"Download\" role=\"button\">\n                    <svg width=\"24\" height=\"24\" fill=\"#566574\" enable-background=\"new 0 0 29.978 29.978\" version=\"1.1\" viewBox=\"0 0 29.978 29.978\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\">\n                        <path d=\"m25.462 19.105v6.848h-20.947v-6.848h-4.026v8.861c0 1.111 0.9 2.012 2.016 2.012h24.967c1.115 0 2.016-0.9 2.016-2.012v-8.861h-4.026z\"/>\n                        <path d=\"m14.62 18.426l-5.764-6.965s-0.877-0.828 0.074-0.828 3.248 0 3.248 0 0-0.557 0-1.416v-8.723s-0.129-0.494 0.615-0.494h4.572c0.536 0 0.524 0.416 0.524 0.416v8.742 1.266s1.842 0 2.998 0c1.154 0 0.285 0.867 0.285 0.867s-4.904 6.51-5.588 7.193c-0.492 0.495-0.964-0.058-0.964-0.058z\"/>\n                    </svg>\n                </a>\n            </div>\n        ";
    }
  }, {
    key: "formatTime",
    value: function formatTime(time) {
      var min = Math.floor(time / 60);
      var sec = Math.floor(time % 60);
      return "".concat(min < 10 ? "0".concat(min) : min, ":").concat(sec < 10 ? "0".concat(sec) : sec);
    }
  }, {
    key: "pausePlayer",
    value: function pausePlayer(player) {
      var playPauseButton = player.parentElement.querySelector('.play-pause-btn__icon');
      playPauseButton.attributes.d.value = 'M18 12L0 24V0';
      player.pause();
    }
  }, {
    key: "playPlayer",
    value: function playPlayer(player) {
      var playPauseButton = player.parentElement.querySelector('.play-pause-btn__icon');
      playPauseButton.attributes.d.value = 'M0 0h6v24H0zM12 0h6v24h-6z';
      player.play();
    }
  }, {
    key: "stopOtherPlayers",
    value: function stopOtherPlayers() {
      var players = document.querySelectorAll('.green-audio-player audio');

      for (var i = 0; i < players.length; i++) {
        GreenAudioPlayer.pausePlayer(players[i]);
      }
    }
  }]);

  return GreenAudioPlayer;
}();

var _default = GreenAudioPlayer;
exports.default = _default;

},{}]},{},[1])(1)
});