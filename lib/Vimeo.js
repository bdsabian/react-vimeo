'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _keymirror = require('keymirror');

var _keymirror2 = _interopRequireDefault(_keymirror);

var _jsonp = require('jsonp');

var _jsonp2 = _interopRequireDefault(_jsonp);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _PlayButton = require('./Play-Button');

var _PlayButton2 = _interopRequireDefault(_PlayButton);

var _Spinner = require('./Spinner');

var _Spinner2 = _interopRequireDefault(_Spinner);

var debug = (0, _debug2['default'])('vimeo:player');
var noop = function noop() {};
var playerEvents = (0, _keymirror2['default'])({
  cuechange: null,
  finish: null,
  loadProgress: null,
  pause: null,
  play: null,
  playProgress: null,
  seek: null
});

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}

function getFuncForEvent(event, props) {
  return props['on' + capitalize(event)] || function () {};
}

function post(method, value, player, playerOrigin) {
  try {
    player.contentWindow.postMessage({ method: method, value: value }, playerOrigin);
  } catch (err) {
    return err;
  }
  return null;
}

exports['default'] = _react2['default'].createClass({
  displayName: 'Vimeo',

  propTypes: {
    className: _react.PropTypes.string,
    loading: _react.PropTypes.element,
    onCuechange: _react.PropTypes.func,
    onError: _react.PropTypes.func,
    onFinish: _react.PropTypes.func,
    onLoadProgress: _react.PropTypes.func,
    onPause: _react.PropTypes.func,
    onPlay: _react.PropTypes.func,
    onPlayProgress: _react.PropTypes.func,
    onReady: _react.PropTypes.func,
    onSeek: _react.PropTypes.func,
    playButton: _react.PropTypes.node,
    autoPlay: _react.PropTypes.bool,
    videoId: _react.PropTypes.string.isRequired
  },

  getDefaultProps: function getDefaultProps() {
    var defaults = Object.keys(playerEvents).concat(['ready']).reduce(function (defaults, event) {
      defaults['on' + capitalize(event)] = noop;
      return defaults;
    }, {});

    defaults.className = 'vimeo';
    defaults.autoPlay = true;
    return defaults;
  },

  getInitialState: function getInitialState() {
    return {
      imageLoaded: false,
      playerOrigin: '*',
      showingVideo: false,
      thumb: null
    };
  },

  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    if (nextProps.videoId !== this.props.videoId) {
      this.setState({
        thumb: null,
        imageLoaded: false,
        showingVideo: false
      });
    }
  },

  componentDidMount: function componentDidMount() {
    this.fetchVimeoData();
  },

  componentDidUpdate: function componentDidUpdate() {
    this.fetchVimeoData();
  },

  componentWillUnmount: function componentWillUnmount() {
    var removeEventListener = typeof window !== 'undefined' ? window.removeEventListener.bind(window) : noop;

    removeEventListener('message', this.onMessage);
  },

  addMessageListener: function addMessageListener() {
    var addEventListener = typeof window !== 'undefined' ? window.addEventListener.bind(window) : noop;

    addEventListener('message', this.onMessage);
  },

  onError: function onError(err) {
    if (this.props.onError) {
      this.props.onError(err);
    }
    throw err;
  },

  onMessage: function onMessage(e) {
    var onReady = this.props.onReady;
    var playerOrigin = this.state.playerOrigin;

    if (playerOrigin === '*') {
      this.setState({
        playerOrigin: e.origin
      });
    }

    // Handle messages from the vimeo player only
    if (!/^https?:\/\/player.vimeo.com/.test(e.origin)) {
      return false;
    }

    var dats = undefined;
    try {
      dats = JSON.parse(e.data);
    } catch (err) {
      debug('error parsing message', err);
      dats = {};
    }

    if (dats.event === 'ready') {
      var player = this.refs.player;

      debug('player ready');
      this.onReady(player, playerOrigin === '*' ? e.origin : playerOrigin);
      return onReady(dats);
    }

    getFuncForEvent(dats.event, this.props)(dats);
  },

  onReady: function onReady(player, playerOrigin) {
    var _this = this;

    Object.keys(playerEvents).forEach(function (event) {
      var err = post('addEventListener', event, player, playerOrigin);
      if (err) {
        _this.onError(err);
      }
    });
    if (this.props.autoPlay) {
      this.setState({ showingVideo: true });
    }
  },

  playVideo: function playVideo(e) {
    e.preventDefault();
    this.setState({ showingVideo: true });
  },

  getIframeUrl: function getIframeUrl() {
    return '//player.vimeo.com/video/' + this.props.videoId + '?autoplay=1';
  },

  fetchVimeoData: function fetchVimeoData() {
    var _this2 = this;

    if (this.state.imageLoaded) {
      return;
    }
    var id = this.props.videoId;

    (0, _jsonp2['default'])('//vimeo.com/api/v2/video/' + id + '.json', {
      prefix: 'vimeo'
    }, function (err, res) {
      if (err) {
        debug('jsonp err: ', err.message);
        _this2.onError(err);
      }
      debug('jsonp response', res);
      _this2.setState({
        thumb: res[0].thumbnail_large,
        imageLoaded: true
      });
    });
  },

  renderImage: function renderImage() {
    if (this.state.showingVideo || !this.state.imageLoaded) {
      return;
    }

    var style = {
      backgroundImage: 'url(' + this.state.thumb + ')',
      display: !this.state.showingVideo ? 'block' : 'none',
      height: '100%',
      width: '100%'
    };

    return _react2['default'].createElement(
      'div',
      {
        className: 'vimeo-image',
        style: style },
      _react2['default'].createElement(_PlayButton2['default'], { onClick: this.playVideo })
    );
  },

  renderIframe: function renderIframe() {
    if (!this.state.showingVideo) {
      return;
    }

    this.addMessageListener();

    var embedVideoStyle = {
      display: this.state.showingVideo ? 'block' : 'none',
      height: '100%',
      width: '100%'
    };

    return _react2['default'].createElement(
      'div',
      {
        className: 'vimeo-embed',
        style: embedVideoStyle },
      _react2['default'].createElement('iframe', {
        frameBorder: '0',
        ref: 'player',
        src: this.getIframeUrl() })
    );
  },

  renderLoading: function renderLoading(imageLoaded, loadingElement) {
    if (imageLoaded) {
      return;
    }
    if (loadingElement) {
      return loadingElement;
    }
    return _react2['default'].createElement(_Spinner2['default'], null);
  },

  render: function render() {
    return _react2['default'].createElement(
      'div',
      { className: this.props.className },
      this.renderLoading(this.state.imageLoaded, this.props.loading),
      this.renderImage(),
      this.renderIframe()
    );
  }
});
module.exports = exports['default'];