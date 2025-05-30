/*
  @author: GeoGebra - Dynamic Mathematics for Everyone, http://www.geogebra.org
  @license: This file is subject to the GeoGebra Non-Commercial License Agreement, see http://www.geogebra.org/license. For questions please write us at office@geogebra.org.
*/
(function () {
  if (typeof window.GGBApplet == "function") {
    console.warn("deployggb.js was loaded twice");
    return
  }
  var isRenderGGBElementEnabled = false;
  var scriptLoadStarted = false;
  var html5AppletsToProcess = null;
  var ggbHTML5LoadedCodebaseIsWebSimple = false;
  var ggbHTML5LoadedCodebaseVersion = null;
  var ggbHTML5LoadedScript = null;
  var GGBApplet = function () {
    "use strict";
    var applet = {};
    var ggbVersion = "5.0";
    var parameters = {};
    var views = null;
    var html5NoWebSimple = false;
    var html5NoWebSimpleParamExists = false;
    var appletID = null;
    var initComplete = false;
    var html5OverwrittenCodebaseVersion = null;
    var html5OverwrittenCodebase = null;
    for (var i = 0; i < arguments.length; i++) {
      var p = arguments[i];
      if (p !== null) {
        switch (typeof p) {
          case "number":
            ggbVersion = p.toFixed(1);
            break;
          case "string":
            if (p.match(new RegExp("^[0-9]\\.[0-9]+$"))) {
              ggbVersion = p
            } else {
              appletID = p
            }
            break;
          case "object":
            if (typeof p.is3D !== "undefined") {
              views = p
            } else {
              parameters = p
            }
            break;
          case "boolean":
            html5NoWebSimple = p;
            html5NoWebSimpleParamExists = true;
            break
        }
      }
    }
    if (views === null) {
      views = {
        is3D: false,
        AV: false,
        SV: false,
        CV: false,
        EV2: false,
        CP: false,
        PC: false,
        DA: false,
        FI: false,
        PV: false,
        macro: false
      };
      if (parameters.material_id !== undefined && !html5NoWebSimpleParamExists) {
        html5NoWebSimple = true
      }
    }
    if (appletID !== null && parameters.id === undefined) {
      parameters.id = appletID
    }
    var jnlpFilePath = "";
    var html5Codebase = "";
    var isHTML5Offline = false;
    var loadedAppletType = null;
    var html5CodebaseVersion = null;
    var html5CodebaseScript = null;
    var html5CodebaseIsWebSimple = false;
    var previewImagePath = null;
    var previewLoadingPath = null;
    var previewPlayPath = null;
    var fonts_css_url = null;
    var jnlpBaseDir = null;
    if (parameters.height !== undefined) {
      parameters.height = Math.round(parameters.height)
    }
    if (parameters.width !== undefined) {
      parameters.width = Math.round(parameters.width)
    }
    var parseVersion = function (d) {
      return parseFloat(d) > 4 ? parseFloat(d) : 5
    };
    applet.setHTML5Codebase = function (codebase, offline) {
      html5OverwrittenCodebase = codebase;
      setHTML5CodebaseInternal(codebase, offline)
    };
    applet.setJavaCodebase = applet.setJavaCodebaseVersion = applet.isCompiledInstalled = applet.setPreCompiledScriptPath = applet.setPreCompiledResourcePath = function () {};
    applet.setHTML5CodebaseVersion = function (version, offline) {
      var numVersion = parseFloat(version);
      if (numVersion !== NaN && numVersion < 5) {
        console.log("The GeoGebra HTML5 codebase version " + numVersion + " is deprecated. Using version latest instead.");
        return
      }
      html5OverwrittenCodebaseVersion = version;
      setDefaultHTML5CodebaseForVersion(version, offline)
    };
    applet.getHTML5CodebaseVersion = function () {
      return html5CodebaseVersion
    };
    applet.getParameters = function () {
      return parameters
    };
    applet.setFontsCSSURL = function (url) {
      fonts_css_url = url
    };
    applet.setGiacJSURL = function (url) {};
    applet.setJNLPFile = function (newJnlpFilePath) {
      jnlpFilePath = newJnlpFilePath
    };
    applet.setJNLPBaseDir = function (baseDir) {};
    applet.inject = function () {
      function isOwnIFrame() {
        return window.frameElement && window.frameElement.getAttribute("data-singleton")
      }
      var type = "auto";
      var container_ID = parameters.id;
      var container;
      var noPreview = false;
      for (var i = 0; i < arguments.length; i++) {
        var p = arguments[i];
        if (typeof p === "string") {
          p = p.toLowerCase();
          if (p.match(/^(prefer)?(java|html5|compiled|auto|screenshot)$/)) {
            type = p
          } else {
            container_ID = arguments[i]
          }
        } else if (typeof p === "boolean") {
          noPreview = p
        } else if (p instanceof HTMLElement) {
          container = p
        }
      }
      continueInject();

      function continueInject() {
        if (!initComplete) {
          setTimeout(continueInject, 200);
          return
        }
        type = detectAppletType(type);
        var appletElem = container || document.getElementById(container_ID);
        if (!appletElem) {
          console.log("possibly bug on ajax loading? ");
          return
        }
        applet.removeExistingApplet(appletElem, false);
        if (parameters.width === undefined && appletElem.clientWidth) {
          parameters.width = appletElem.clientWidth
        }
        if (parameters.height === undefined && appletElem.clientHeight) {
          parameters.height = appletElem.clientHeight
        }
        if (!(parameters.width && parameters.height) && type === "html5") {
          delete parameters.width;
          delete parameters.height
        }
        loadedAppletType = type;
        if (type === "screenshot") {
          injectScreenshot(appletElem, parameters)
        } else {
          var playButton = false;
          if (parameters.hasOwnProperty("playButton") && parameters.playButton || parameters.hasOwnProperty("clickToLoad") && parameters.clickToLoad) {
            playButton = true
          } else if (parameters.hasOwnProperty("playButtonAutoDecide") && parameters.playButtonAutoDecide) {
            playButton = (!isInIframe() || isOwnIFrame()) && isMobileDevice()
          }
          if (playButton) {
            loadedAppletType = "screenshot";
            injectPlayButton(appletElem, parameters, noPreview, type)
          } else {
            injectHTML5Applet(appletElem, parameters, noPreview)
          }
        }
      }
      return
    };

    function isInIframe() {
      try {
        return window.self !== window.top
      } catch (e) {
        return true
      }
    }

    function isMobileDevice() {
      if (parameters.hasOwnProperty("screenshotGenerator") && parameters.screenshotGenerator) {
        return false
      }
      return Math.max(screen.width, screen.height) < 800
    }
    applet.getViews = function () {
      return views
    };
    applet.isJavaInstalled = function () {
      return false
    };
    var fetchParametersFromApi = function (successCallback) {
      var onSuccess = function (text) {
        var jsonData = JSON.parse(text);
        var isGeoGebra = function (element) {
          return element.type == "G" || element.type == "E"
        };
        var item = jsonData.elements ? jsonData.elements.filter(isGeoGebra)[0] : jsonData;
        if (!item || !item.url) {
          onError();
          return
        }
        parameters.fileName = item.url;
        updateAppletSettings(item.settings || {});
        views.is3D = true;
        var imageDir = "https://www.geogebra.org/images/";
        applet.setPreviewImage(previewImagePath || item.previewUrl, imageDir + "GeoGebra_loading.png", imageDir + "applet_play.png");
        successCallback()
      };
      var onError = function () {
        parameters.onError && parameters.onError();
        log("Error: Fetching material (id " + parameters.material_id + ") failed.", parameters)
      };
      var host = location.host.match(/(www|stage|beta|groot|alpha).geogebra.(org|net)/) ? location.host : "www.geogebra.org";
      var path = "/materials/" + parameters.material_id + "?scope=basic";
      sendCorsRequest("https://" + host + "/api/proxy.php?path=" + encodeURIComponent(path), onSuccess, onError)
    };

    function updateAppletSettings(settings) {
      var parameterNames = ["width", "height", "showToolBar", "showMenuBar", "showAlgebraInput", "allowStyleBar", "showResetIcon", "enableLabelDrags", "enableShiftDragZoom", "enableRightClick", "appName"];
      ["enableLabelDrags", "enableShiftDragZoom", "enableRightClick"].forEach((function (name) {
        settings[name] = !!settings[name]
      }));
      parameterNames.forEach((function (name) {
        if (parameters[name] === undefined && settings[name] !== undefined) {
          parameters[name] = settings[name]
        }
      }));
      if (parameters.showToolBarHelp === undefined) {
        parameters.showToolBarHelp = parameters.showToolBar
      }
    }

    function sendCorsRequest(url, onSuccess, onError) {
      var xhr = new XMLHttpRequest;
      xhr.open("GET", url);
      xhr.onload = function () {
        onSuccess(xhr.responseText)
      };
      xhr.onerror = onError;
      xhr.send()
    }
    applet.isHTML5Installed = function () {
      return true
    };
    applet.getLoadedAppletType = function () {
      return loadedAppletType
    };
    applet.setPreviewImage = function (previewFilePath, loadingFilePath, playFilePath) {
      previewImagePath = previewFilePath;
      previewLoadingPath = loadingFilePath;
      previewPlayPath = playFilePath
    };
    applet.removeExistingApplet = function (appletParent, showScreenshot) {
      var i;
      if (typeof appletParent === "string") {
        appletParent = document.getElementById(appletParent)
      }
      loadedAppletType = null;
      var removedID = null;
      for (i = 0; i < appletParent.childNodes.length; i++) {
        var currentChild = appletParent.childNodes[i];
        var className = currentChild.className;
        if (className === "applet_screenshot") {
          if (showScreenshot) {
            currentChild.style.display = "block";
            loadedAppletType = "screenshot"
          } else {
            currentChild.style.display = "none"
          }
        } else if (className !== "applet_scaler prerender") {
          appletParent.removeChild(currentChild);
          removedID = className && className.indexOf("appletParameters") != -1 ? currentChild.id : null;
          i--
        }
      }
      var appName = parameters.id !== undefined ? parameters.id : removedID;
      var app = window[appName];
      if (app && typeof app.getBase64 === "function") {
        app.remove();
        window[appName] = null
      }
    };
    applet.refreshHitPoints = function () {
      if (parseVersion(ggbHTML5LoadedCodebaseVersion) >= 5) {
        return true
      }
      var app = applet.getAppletObject();
      if (app) {
        if (typeof app.recalculateEnvironments === "function") {
          app.recalculateEnvironments();
          return true
        }
      }
      return false
    };
    applet.startAnimation = function () {
      var app = applet.getAppletObject();
      if (app) {
        if (typeof app.startAnimation === "function") {
          app.startAnimation();
          return true
        }
      }
      return false
    };
    applet.stopAnimation = function () {
      var app = applet.getAppletObject();
      if (app) {
        if (typeof app.stopAnimation === "function") {
          app.stopAnimation();
          return true
        }
      }
      return false
    };
    applet.getAppletObject = function () {
      var appName = parameters.id !== undefined ? parameters.id : "ggbApplet";
      return window[appName]
    };
    applet.resize = function () {};
    var appendParam = function (applet, name, value) {
      var param = document.createElement("param");
      param.setAttribute("name", name);
      param.setAttribute("value", value);
      applet.appendChild(param)
    };
    var valBoolean = function (value) {
      return value && value !== "false"
    };
    var injectHTML5Applet = function (appletElem, parameters, noPreview) {
      if (parseVersion(html5CodebaseVersion) <= 4.2) {
        noPreview = true
      }
      var loadScript = !isRenderGGBElementEnabled && !scriptLoadStarted;
      if (!isRenderGGBElementEnabled && !scriptLoadStarted || (ggbHTML5LoadedCodebaseVersion !== html5CodebaseVersion || ggbHTML5LoadedCodebaseIsWebSimple && !html5CodebaseIsWebSimple)) {
        loadScript = true;
        isRenderGGBElementEnabled = false;
        scriptLoadStarted = false
      }
      var article = document.createElement("div");
      article.classList.add("appletParameters", "notranslate");
      var oriWidth = parameters.width;
      var oriHeight = parameters.height;
      parameters.disableAutoScale = parameters.disableAutoScale === undefined ? GGBAppletUtils.isFlexibleWorksheetEditor() : parameters.disableAutoScale;
      if (parameters.width !== undefined) {
        if (parseVersion(html5CodebaseVersion) <= 4.4) {
          if (valBoolean(parameters.showToolBar)) {
            parameters.height -= 7
          }
          if (valBoolean(parameters.showAlgebraInput)) {
            parameters.height -= 37
          }
          if (parameters.width < 605 && valBoolean(parameters.showToolBar)) {
            parameters.width = 605;
            oriWidth = 605
          }
        } else {
          var minWidth = 100;
          if (valBoolean(parameters.showToolBar) || valBoolean(parameters.showMenuBar)) {
            if (parameters.hasOwnProperty("customToolBar")) {
              parameters.customToolbar = parameters.customToolBar
            }
            minWidth = valBoolean(parameters.showMenuBar) ? 245 : 155
          }
          if (oriWidth < minWidth) {
            parameters.width = minWidth;
            oriWidth = minWidth
          }
        }
      }
      article.style.border = "none";
      article.style.display = "inline-block";
      for (var key in parameters) {
        if (parameters.hasOwnProperty(key) && key !== "appletOnLoad") {
          article.setAttribute("data-param-" + key, parameters[key])
        }
      }
      if (fonts_css_url) {
        article.setAttribute("data-param-fontscssurl", fonts_css_url)
      }
      applet.resize = function () {
        GGBAppletUtils.responsiveResize(appletElem, parameters)
      };
      window.addEventListener("resize", (function (evt) {
        applet.resize()
      }));
      var oriAppletOnload = typeof parameters.appletOnLoad === "function" ? parameters.appletOnLoad : function () {};
      if (!noPreview && parameters.width !== undefined) {
        if (!parameters.hasOwnProperty("showSplash")) {
          article.setAttribute("data-param-showSplash", "false")
        }
        var previewPositioner = appletElem.querySelector(".applet_scaler.prerender");
        var preRendered = previewPositioner !== null;
        if (!preRendered) {
          var previewContainer = createScreenShotDiv(oriWidth, oriHeight, parameters.borderColor, false);
          previewPositioner = document.createElement("div");
          previewPositioner.className = "applet_scaler";
          previewPositioner.style.position = "relative";
          previewPositioner.style.display = "block";
          previewPositioner.style.width = oriWidth + "px";
          previewPositioner.style.height = oriHeight + "px"
        } else {
          var previewContainer = previewPositioner.querySelector(".ggb_preview")
        }
        if (window.GGBT_spinner) {
          window.GGBT_spinner.attachSpinner(previewPositioner, "66%")
        }
        if (parseVersion(html5CodebaseVersion) >= 5) {
          parameters.appletOnLoad = function (api) {
            var preview = appletElem.querySelector(".ggb_preview");
            if (preview) {
              preview.parentNode.removeChild(preview)
            }
            if (window.GGBT_spinner) {
              window.GGBT_spinner.removeSpinner(previewPositioner)
            }
            if (window.GGBT_wsf_view) {
              $(window).trigger("resize")
            }
            oriAppletOnload(api)
          };
          if (!preRendered) {
            previewPositioner.appendChild(previewContainer)
          }
        } else {
          article.appendChild(previewContainer)
        }
        previewPositioner.appendChild(article);
        if (!preRendered) {
          appletElem.appendChild(previewPositioner)
        }
        setTimeout((function () {
          applet.resize()
        }), 1)
      } else {
        var appletScaler = document.createElement("div");
        appletScaler.className = "applet_scaler";
        appletScaler.style.position = "relative";
        appletScaler.style.display = "block";
        appletScaler.appendChild(article);
        appletElem.appendChild(appletScaler);
        parameters.appletOnLoad = function (api) {
          applet.resize();
          oriAppletOnload(api)
        }
      }

      function renderGGBElementWithParams(article, parameters) {
        if (parameters && typeof parameters.appletOnLoad === "function" && typeof renderGGBElement === "function") {
          renderGGBElement(article, parameters.appletOnLoad)
        } else {
          renderGGBElement(article)
        }
        log("GeoGebra HTML5 applet injected and rendered with previously loaded codebase.", parameters)
      }

      function renderGGBElementOnTube(a, parameters) {
        if (typeof renderGGBElement === "undefined") {
          if (html5AppletsToProcess === null) {
            html5AppletsToProcess = []
          }
          html5AppletsToProcess.push({
            article: a,
            params: parameters
          });
          window.renderGGBElementReady = function () {
            isRenderGGBElementEnabled = true;
            if (html5AppletsToProcess !== null && html5AppletsToProcess.length) {
              html5AppletsToProcess.forEach((function (obj) {
                renderGGBElementWithParams(obj.article, obj.params)
              }));
              html5AppletsToProcess = null
            }
          };
          if (parseVersion(html5CodebaseVersion) < 5) {
            a.className += " geogebraweb"
          }
        } else {
          renderGGBElementWithParams(a, parameters)
        }
      }
      if (loadScript) {
        scriptLoadStarted = true;
        for (var i = 0; i < article.childNodes.length; i++) {
          var tag = article.childNodes[i].tagName;
          if (tag === "TABLE") {
            article.removeChild(article.childNodes[i]);
            i--
          }
        }
        if (ggbHTML5LoadedScript !== null) {
          var el = document.querySelector('script[src="' + ggbHTML5LoadedScript + '"]');
          if (el !== undefined && el !== null) {
            el.parentNode.removeChild(el)
          }
        }
        var script = document.createElement("script");
        var scriptLoaded = function () {
          renderGGBElementOnTube(article, parameters)
        };
        script.src = html5Codebase + html5CodebaseScript;
        ggbHTML5LoadedCodebaseIsWebSimple = html5CodebaseIsWebSimple;
        ggbHTML5LoadedCodebaseVersion = html5CodebaseVersion;
        ggbHTML5LoadedScript = script.src;
        log("GeoGebra HTML5 codebase loaded: '" + html5Codebase + "'.", parameters);
        if (!html5OverwrittenCodebase && (!html5OverwrittenCodebaseVersion || html5OverwrittenCodebaseVersion == "5.0")) {
          if (html5CodebaseIsWebSimple) {
            webSimple.succeeded = webSimple.succeeded || webSimple()
          } else {
            web3d.succeeded = web3d.succeeded || web3d()
          }
          scriptLoaded()
        } else if (html5Codebase.requirejs) {
          require(["geogebra/runtime/js/web3d/web3d.nocache"], scriptLoaded)
        } else {
          script.onload = scriptLoaded;
          appletElem.appendChild(script)
        }
      } else {
        renderGGBElementOnTube(article, parameters)
      }
      parameters.height = oriHeight;
      parameters.width = oriWidth
    };
    var injectScreenshot = function (appletElem, parameters, showPlayButton) {
      var previewContainer = createScreenShotDiv(parameters.width, parameters.height, parameters.borderColor, showPlayButton);
      var previewPositioner = document.createElement("div");
      previewPositioner.style.position = "relative";
      previewPositioner.style.display = "block";
      previewPositioner.style.width = parameters.width + "px";
      previewPositioner.style.height = parameters.height + "px";
      previewPositioner.className = "applet_screenshot applet_scaler" + (showPlayButton ? " applet_screenshot_play" : "");
      previewPositioner.appendChild(previewContainer);
      var scale = GGBAppletUtils.getScale(parameters, appletElem, showPlayButton);
      if (showPlayButton) {
        appletElem.appendChild(getPlayButton());
        if (!window.GGBT_wsf_view) {
          appletElem.style.position = "relative"
        }
      } else if (window.GGBT_spinner) {
        window.GGBT_spinner.attachSpinner(previewPositioner, "66%")
      }
      appletElem.appendChild(previewPositioner);
      if (scale !== 1 && !isNaN(scale)) {
        GGBAppletUtils.scaleElement(previewPositioner, scale);
        previewPositioner.style.width = parameters.width + "px";
        previewPositioner.style.height = parameters.height + "px";
        previewPositioner.parentNode.style.width = parameters.width * scale + "px";
        previewPositioner.parentNode.style.height = parameters.height * scale + "px"
      }
      applet.resize = function () {
        resizeScreenshot(appletElem, previewContainer, previewPositioner, showPlayButton)
      };
      window.addEventListener("resize", (function (evt) {
        applet.resize()
      }));
      applet.resize()
    };

    function resizeScreenshot(appletElem, previewContainer, previewPositioner, showPlayButton) {
      if (!appletElem.contains(previewContainer)) {
        return
      }
      if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
        if (appletElem.id !== "fullscreencontent") {
          return
        }
        window.GGBT_wsf_view.setCloseBtnPosition(appletElem)
      }
      var scale = GGBAppletUtils.getScale(parameters, appletElem, showPlayButton);
      if (previewPositioner.parentNode !== null) {
        if (!isNaN(scale) && scale !== 1) {
          GGBAppletUtils.scaleElement(previewPositioner, scale);
          previewPositioner.parentNode.style.width = parameters.width * scale + "px";
          previewPositioner.parentNode.style.height = parameters.height * scale + "px"
        } else {
          GGBAppletUtils.scaleElement(previewPositioner, 1);
          previewPositioner.parentNode.style.width = parameters.width + "px";
          previewPositioner.parentNode.style.height = parameters.height + "px"
        }
      }
      if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
        GGBAppletUtils.positionCenter(appletElem)
      }
      if (typeof window.GGBT_ws_header_footer === "object") {
        window.GGBT_ws_header_footer.setWsScrollerHeight()
      }
    }
    applet.onExitFullscreen = function (fullscreenContainer, appletElem) {
      appletElem.appendChild(fullscreenContainer)
    };
    var injectPlayButton = function (appletElem, parameters, noPreview, type) {
      injectScreenshot(appletElem, parameters, true);
      var play = function () {
        var elems = [];
        for (i = 0; i < appletElem.childNodes.length; i++) {
          elems.push(appletElem.childNodes[i])
        }
        if (window.GGBT_wsf_view) {
          var content = window.GGBT_wsf_view.renderFullScreen(appletElem, parameters.id);
          var container = document.getElementById("fullscreencontainer");
          var oldcontent = jQuery(appletElem).find(".fullscreencontent");
          if (oldcontent.length > 0) {
            content.remove();
            oldcontent.attr("id", "fullscreencontent").show();
            jQuery(container).append(oldcontent);
            window.dispatchEvent(new Event("resize"))
          } else {
            injectHTML5Applet(content, parameters, false)
          }
          window.GGBT_wsf_view.launchFullScreen(container)
        } else {
          loadedAppletType = type;
          injectHTML5Applet(appletElem, parameters, false)
        }
        if (!window.GGBT_wsf_view) {
          for (i = 0; i < elems.length; i++) {
            appletElem.removeChild(elems[i])
          }
        }
      };
      var imgs = appletElem.getElementsByClassName("ggb_preview_play");
      for (var i = 0; i < imgs.length; i++) {
        imgs[i].addEventListener("click", play, false);
        imgs[i].addEventListener("ontouchstart", play, false)
      }
      if (typeof window.ggbAppletPlayerOnload === "function") {
        window.ggbAppletPlayerOnload(appletElem)
      }
      if (isMobileDevice() && window.GGBT_wsf_view) {
        $(".wsf-element-fullscreen-button").remove()
      }
    };
    var getPlayButton = function () {
      var playButtonContainer = document.createElement("div");
      playButtonContainer.className = "ggb_preview_play icon-applet-play";
      if (!window.GGBT_wsf_view) {
        var css = "" + ".icon-applet-play {" + "   width: 100%;" + "   height: 100%;box-sizing: border-box;position: absolute;z-index: 1001;cursor: pointer;border-width: 0px;" + "   background-color: transparent;background-repeat: no-repeat;left: 0;top: 0;background-position: center center;" + '   background-image: url("https://www.geogebra.org/images/worksheet/icon-start-applet.png");' + "}" + ".icon-applet-play:hover {" + 'background-image: url("https://www.geogebra.org/images/worksheet/icon-start-applet-hover.png");' + "}";
        var style = document.createElement("style");
        if (style.styleSheet) {
          style.styleSheet.cssText = css
        } else {
          style.appendChild(document.createTextNode(css))
        }
        document.getElementsByTagName("head")[0].appendChild(style)
      }
      return playButtonContainer
    };
    var createScreenShotDiv = function (oriWidth, oriHeight, borderColor, showPlayButton) {
      var previewContainer = document.createElement("div");
      previewContainer.className = "ggb_preview";
      previewContainer.style.position = "absolute";
      previewContainer.style.zIndex = "90";
      previewContainer.style.width = oriWidth - 2 + "px";
      previewContainer.style.height = oriHeight - 2 + "px";
      previewContainer.style.top = "0px";
      previewContainer.style.left = "0px";
      previewContainer.style.overflow = "hidden";
      previewContainer.style.backgroundColor = "white";
      var bc = "lightgrey";
      if (borderColor !== undefined) {
        if (borderColor === "none") {
          bc = "transparent"
        } else {
          bc = borderColor
        }
      }
      previewContainer.style.border = "1px solid " + bc;
      var preview = document.createElement("img");
      preview.style.position = "relative";
      preview.style.zIndex = "1000";
      preview.style.top = "-1px";
      preview.style.left = "-1px";
      if (previewImagePath !== null) {
        preview.setAttribute("src", previewImagePath)
      }
      preview.style.opacity = .7;
      if (previewLoadingPath !== null) {
        var previewOverlay;
        var pWidth, pHeight;
        if (!showPlayButton) {
          previewOverlay = document.createElement("img");
          previewOverlay.style.position = "absolute";
          previewOverlay.style.zIndex = "1001";
          previewOverlay.style.opacity = 1;
          preview.style.opacity = .3;
          pWidth = 360;
          if (pWidth > oriWidth / 4 * 3) {
            pWidth = oriWidth / 4 * 3
          }
          pHeight = pWidth / 5.8;
          previewOverlay.setAttribute("src", previewLoadingPath);
          previewOverlay.setAttribute("width", pWidth);
          previewOverlay.setAttribute("height", pHeight);
          var pX = (oriWidth - pWidth) / 2;
          var pY = (oriHeight - pHeight) / 2;
          previewOverlay.style.left = pX + "px";
          previewOverlay.style.top = pY + "px";
          previewContainer.appendChild(previewOverlay)
        }
      }
      previewContainer.appendChild(preview);
      return previewContainer
    };
    var detectAppletType = function (preferredType) {
      preferredType = preferredType.toLowerCase();
      if (preferredType === "html5" || preferredType === "screenshot") {
        return preferredType
      }
      return "html5"
    };
    var modules = ["web", "webSimple", "web3d", "tablet", "tablet3d", "phone"];
    var setDefaultHTML5CodebaseForVersion = function (version, offline) {
      html5CodebaseVersion = version;
      if (offline) {
        setHTML5CodebaseInternal(html5CodebaseVersion, true);
        return
      }
      var hasWebSimple = !html5NoWebSimple;
      if (hasWebSimple) {
        var v = parseVersion(html5CodebaseVersion);
        if (!isNaN(v) && v < 4.4) {
          hasWebSimple = false
        }
      }
      var protocol, codebase;
      if (window.location.protocol.substr(0, 4) === "http") {
        protocol = window.location.protocol
      } else {
        protocol = "http:"
      }
      var index = html5CodebaseVersion.indexOf("//");
      if (index > 0) {
        codebase = html5CodebaseVersion
      } else if (index === 0) {
        codebase = protocol + html5CodebaseVersion
      } else {
        codebase = "https://www.geogebra.org/apps/5.0.793.0/"
      }
      for (var key in modules) {
        if (html5CodebaseVersion.slice(modules[key].length * -1) === modules[key] || html5CodebaseVersion.slice((modules[key].length + 1) * -1) === modules[key] + "/") {
          setHTML5CodebaseInternal(codebase, false);
          return
        }
      }
      if (!GGBAppletUtils.isFlexibleWorksheetEditor() && hasWebSimple && !views.is3D && !views.AV && !views.SV && !views.CV && !views.EV2 && !views.CP && !views.PC && !views.DA && !views.FI && !views.PV && !valBoolean(parameters.showToolBar) && !valBoolean(parameters.showMenuBar) && !valBoolean(parameters.showAlgebraInput) && !valBoolean(parameters.enableRightClick) && (!parameters.appName || parameters.appName == "classic")) {
        codebase += "webSimple/"
      } else {
        codebase += "web3d/"
      }
      setHTML5CodebaseInternal(codebase, false)
    };
    var setHTML5CodebaseInternal = function (codebase, offline) {
      if (codebase.requirejs) {
        html5Codebase = codebase;
        return
      }
      if (codebase.slice(-1) !== "/") {
        codebase += "/"
      }
      html5Codebase = codebase;
      if (offline === null) {
        offline = codebase.indexOf("http") === -1
      }
      isHTML5Offline = offline;
      html5CodebaseScript = "web.nocache.js";
      html5CodebaseIsWebSimple = false;
      var folders = html5Codebase.split("/");
      if (folders.length > 1) {
        if (!offline && folders[folders.length - 2] === "webSimple") {
          html5CodebaseScript = "webSimple.nocache.js";
          html5CodebaseIsWebSimple = true
        } else if (modules.indexOf(folders[folders.length - 2]) >= 0) {
          html5CodebaseScript = folders[folders.length - 2] + ".nocache.js"
        }
      }
      folders = codebase.split("/");
      html5CodebaseVersion = folders[folders.length - 3];
      if (html5CodebaseVersion.substr(0, 4) === "test") {
        html5CodebaseVersion = html5CodebaseVersion.substr(4, 1) + "." + html5CodebaseVersion.substr(5, 1)
      } else if (html5CodebaseVersion.substr(0, 3) === "war" || html5CodebaseVersion.substr(0, 4) === "beta") {
        html5CodebaseVersion = "5.0"
      }
      var numVersion = parseFloat(html5CodebaseVersion);
      if (numVersion !== NaN && numVersion < 5) {
        console.log("The GeoGebra HTML5 codebase version " + numVersion + " is deprecated. Using version latest instead.");
        setDefaultHTML5CodebaseForVersion("5.0", offline)
      }
    };
    var log = function (text, parameters) {
      if (window.console && window.console.log) {
        if (!parameters || typeof parameters.showLogging === "undefined" || parameters.showLogging && parameters.showLogging !== "false") {
          console.log(text)
        }
      }
    };
    if (parameters.material_id !== undefined) {
      fetchParametersFromApi(continueInit)
    } else {
      continueInit()
    }

    function continueInit() {
      var html5Version = ggbVersion;
      if (html5OverwrittenCodebaseVersion !== null) {
        html5Version = html5OverwrittenCodebaseVersion
      } else {
        if (parseFloat(html5Version) < 5) {
          html5Version = "5.0"
        }
      }
      setDefaultHTML5CodebaseForVersion(html5Version, false);
      if (html5OverwrittenCodebase !== null) {
        setHTML5CodebaseInternal(html5OverwrittenCodebase, isHTML5Offline)
      }
      initComplete = true
    }
    return applet
  };
  var GGBAppletUtils = function () {
    "use strict";

    function isFlexibleWorksheetEditor() {
      return window.GGBT_wsf_edit !== undefined
    }

    function scaleElement(el, scale) {
      if (scale != 1) {
        el.style.transformOrigin = "0% 0% 0px";
        el.style.webkitTransformOrigin = "0% 0% 0px";
        el.style.transform = "scale(" + scale + "," + scale + ")";
        el.style.webkitTransform = "scale(" + scale + "," + scale + ")";
        el.style.maxWidth = "initial";
        if (el.querySelector(".ggb_preview") !== null) {
          el.querySelector(".ggb_preview").style.maxWidth = "initial"
        }
        if (el.querySelectorAll(".ggb_preview img")[0] !== undefined) {
          el.querySelectorAll(".ggb_preview img")[0].style.maxWidth = "initial"
        }
        if (el.querySelectorAll(".ggb_preview img")[1] !== undefined) {
          el.querySelectorAll(".ggb_preview img")[1].style.maxWidth = "initial"
        }
      } else {
        el.style.transform = "none";
        el.style.webkitTransform = "none"
      }
    }

    function getWidthHeight(appletElem, appletWidth, allowUpscale, autoHeight, noBorder, scaleContainerClass) {
      var container = null;
      if (scaleContainerClass != undefined && scaleContainerClass != "") {
        var parent = appletElem.parentNode;
        while (parent != null) {
          if ((" " + parent.className + " ").indexOf(" " + scaleContainerClass + " ") > -1) {
            container = parent;
            break
          } else {
            parent = parent.parentNode
          }
        }
      }
      var myWidth = 0,
        myHeight = 0,
        windowWidth = 0,
        border = 0,
        borderRight = 0,
        borderLeft = 0,
        borderTop = 0;
      if (container) {
        myWidth = container.offsetWidth;
        myHeight = Math.max(autoHeight ? container.offsetWidth : 0, container.offsetHeight)
      } else {
        if (window.innerWidth && document.documentElement.clientWidth) {
          myWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
          myHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
          windowWidth = myWidth
        } else {
          myWidth = window.innerWidth;
          myHeight = window.innerHeight;
          windowWidth = window.innerWidth
        }
        if (appletElem) {
          var rect = appletElem.getBoundingClientRect();
          if (rect.left > 0) {
            if (rect.left <= myWidth && (noBorder === undefined || !noBorder)) {
              if (document.dir === "rtl") {
                borderRight = myWidth - rect.width - rect.left;
                borderLeft = windowWidth <= 480 ? 10 : 30
              } else {
                borderLeft = rect.left;
                borderRight = windowWidth <= 480 ? 10 : 30
              }
              border = borderLeft + borderRight
            }
          }
        }
        if (appletElem && typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
          var appletRect = appletElem.getBoundingClientRect();
          if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionRight") {
            border = 40;
            borderTop = 0
          } else if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionTop") {
            border = 0;
            borderTop = 40
          }
        }
      }
      if (appletElem) {
        if ((allowUpscale === undefined || !allowUpscale) && appletWidth > 0 && appletWidth + border < myWidth) {
          myWidth = appletWidth
        } else {
          myWidth -= border
        }
        if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen() && (allowUpscale === undefined || !allowUpscale)) {
          myHeight -= borderTop
        }
      }
      return {
        width: myWidth,
        height: myHeight
      }
    }

    function calcScale(parameters, appletElem, allowUpscale, showPlayButton, scaleContainerClass) {
      if (parameters.isScreenshoGenerator) {
        return 1
      }
      var ignoreHeight = showPlayButton !== undefined && showPlayButton;
      var noScaleMargin = parameters.noScaleMargin != undefined && parameters.noScaleMargin;
      var valBoolean = function (value) {
        return value && value !== "false"
      };
      var autoHeight = valBoolean(parameters.autoHeight);
      var windowSize = getWidthHeight(appletElem, parameters.width, allowUpscale, autoHeight, ignoreHeight && window.GGBT_wsf_view || noScaleMargin, scaleContainerClass);
      var windowWidth = parseInt(windowSize.width);
      var appletWidth = parameters.width;
      var appletHeight = parameters.height;
      if (appletWidth === undefined) {
        var article = appletElem.querySelector(".appletParameters");
        if (article) {
          appletWidth = article.offsetWidth;
          appletHeight = article.offsetHeight
        }
      }
      var xscale = windowWidth / appletWidth;
      var yscale = ignoreHeight ? 1 : windowSize.height / appletHeight;
      if (allowUpscale !== undefined && !allowUpscale) {
        xscale = Math.min(1, xscale);
        yscale = Math.min(1, yscale)
      }
      return Math.min(xscale, yscale)
    }

    function getScale(parameters, appletElem, showPlayButton) {
      var scale = 1,
        autoScale, allowUpscale = false;
      if (parameters.hasOwnProperty("allowUpscale")) {
        allowUpscale = parameters.allowUpscale
      }
      if (parameters.hasOwnProperty("scale")) {
        scale = parseFloat(parameters.scale);
        if (isNaN(scale) || scale === null || scale === 0) {
          scale = 1
        }
        if (scale > 1) {
          allowUpscale = true
        }
      }
      if (appletElem && typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
        allowUpscale = true
      }
      if (!(parameters.hasOwnProperty("disableAutoScale") && parameters.disableAutoScale)) {
        autoScale = calcScale(parameters, appletElem, allowUpscale, showPlayButton, parameters.scaleContainerClass)
      } else {
        return scale
      }
      if (allowUpscale && (!parameters.hasOwnProperty("scale") || scale === 1)) {
        return autoScale
      } else {
        return Math.min(scale, autoScale)
      }
    }

    function positionCenter(appletElem) {
      var windowWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
      var windowHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
      var appletRect = appletElem.getBoundingClientRect();
      var calcHorizontalBorder = (windowWidth - appletRect.width) / 2;
      var calcVerticalBorder = (windowHeight - appletRect.height) / 2;
      if (calcVerticalBorder < 0) {
        calcVerticalBorder = 0
      }
      appletElem.style.position = "relative";
      if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionRight") {
        if (calcHorizontalBorder < 40) {
          appletElem.style.left = "40px"
        } else {
          appletElem.style.left = calcHorizontalBorder + "px"
        }
        appletElem.style.top = calcVerticalBorder + "px"
      } else if (window.GGBT_wsf_view.getCloseBtnPosition() === "closePositionTop") {
        if (calcVerticalBorder < 40) {
          appletElem.style.top = "40px"
        } else {
          appletElem.style.top = calcVerticalBorder + "px"
        }
        appletElem.style.left = calcHorizontalBorder + "px"
      }
    }

    function responsiveResize(appletElem, parameters) {
      var article = appletElem.querySelector(".appletParameters");
      if (article) {
        if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
          if (parameters.id !== article.getAttribute("data-param-id")) {
            return
          }
          window.GGBT_wsf_view.setCloseBtnPosition(appletElem)
        }
        if (article.parentElement && /fullscreen/.test(article.parentElement.className)) {
          return
        }
        var scale = getScale(parameters, appletElem);
        if (isFlexibleWorksheetEditor()) {
          article.setAttribute("data-param-scale", scale)
        }
        var scaleElem = null;
        for (var i = 0; i < appletElem.childNodes.length; i++) {
          if (appletElem.childNodes[i].className !== undefined && appletElem.childNodes[i].className.match(/^applet_scaler/)) {
            scaleElem = appletElem.childNodes[i];
            break
          }
        }
        if (scaleElem !== null && scaleElem.querySelector(".noscale") !== null) {
          return
        }
        var appName = parameters.id !== undefined ? parameters.id : "ggbApplet";
        var app = window[appName];
        if ((app == null || !app.recalculateEnvironments) && scaleElem !== null && !scaleElem.className.match(/fullscreen/)) {
          scaleElem.parentNode.style.transform = "";
          if (!isNaN(scale) && scale !== 1) {
            scaleElem.parentNode.style.width = parameters.width * scale + "px";
            scaleElem.parentNode.style.height = parameters.height * scale + "px";
            scaleElement(scaleElem, scale)
          } else {
            scaleElement(scaleElem, 1);
            scaleElem.parentNode.style.width = parameters.width + "px";
            scaleElem.parentNode.style.height = parameters.height + "px"
          }
        }
        if (typeof window.GGBT_wsf_view === "object" && window.GGBT_wsf_view.isFullscreen()) {
          positionCenter(appletElem)
        }
        if (window.GGBT_wsf_view && !window.GGBT_wsf_view.isFullscreen()) {
          window.GGBT_wsf_general.adjustContentToResize($(article).parents(".content-added-content"))
        }
      }
    }
    return {
      responsiveResize: responsiveResize,
      isFlexibleWorksheetEditor: isFlexibleWorksheetEditor,
      positionCenter: positionCenter,
      getScale: getScale,
      scaleElement: scaleElement
    }
  }();
  if (typeof define === "function" && define.amd) {
    define([], (function () {
      return GGBApplet
    }))
  }
  GGBAppletUtils.makeModule = function (name, permutation) {
    function webModule() {
      var I = "bootstrap",
        J = "begin",
        K = "gwt.codesvr." + name + "=",
        L = "gwt.codesvr=",
        M = name,
        N = "startup",
        O = "DUMMY",
        P = 0,
        Q = 1,
        R = "iframe",
        S = "position:absolute; width:0; height:0; border:none; left: -1000px;",
        T = " top: -1000px;",
        U = "CSS1Compat",
        V = "<!doctype html>",
        W = "",
        X = "<html><head></head><body></body></html>",
        Y = "undefined",
        Z = "readystatechange",
        $ = 10,
        _ = "Chrome",
        ab = 'eval("',
        bb = '");',
        cb = "script",
        db = "javascript",
        eb = "moduleStartup",
        fb = "moduleRequested",
        gb = "Failed to load ",
        hb = "head",
        ib = "meta",
        jb = "name",
        kb = name + "::",
        lb = "::",
        mb = "gwt:property",
        nb = "content",
        ob = "=",
        pb = "gwt:onPropertyErrorFn",
        qb = 'Bad handler "',
        rb = '" for "gwt:onPropertyErrorFn"',
        sb = "gwt:onLoadErrorFn",
        tb = '" for "gwt:onLoadErrorFn"',
        ub = "#",
        vb = "?",
        wb = "/",
        xb = "img",
        yb = "clear.cache.gif",
        zb = "baseUrl",
        Ab = name + ".nocache.js",
        Bb = "base",
        Cb = "//",
        Db = "user.agent",
        Eb = "webkit",
        Fb = "safari",
        Gb = "msie",
        Hb = 11,
        Ib = "ie10",
        Jb = 9,
        Kb = "ie9",
        Lb = 8,
        Mb = "ie8",
        Nb = "gecko",
        Ob = "gecko1_8",
        Pb = 2,
        Qb = 3,
        Rb = 4,
        Sb = "selectingPermutation",
        Tb = "" + name + ".devmode.js",
        Ub = permutation,
        Vb = ":1",
        Wb = ":2",
        Xb = ":3",
        Yb = ":",
        Zb = ".cache.js",
        $b = "loadExternalRefs",
        _b = "end";
      var o = window;
      var p = document;
      r(I, J);

      function q() {
        var a = o.location.search;
        return a.indexOf(K) != -1 || a.indexOf(L) != -1
      }

      function r(a, b) {}
      webModule.__sendStats = r;
      webModule.__moduleName = M;
      webModule.__errFn = null;
      webModule.__moduleBase = O;
      webModule.__softPermutationId = P;
      webModule.__computePropValue = null;
      webModule.__getPropMap = null;
      webModule.__installRunAsyncCode = function () {};
      webModule.__gwtStartLoadingFragment = function () {
        return null
      };
      webModule.__gwt_isKnownPropertyValue = function () {
        return false
      };
      webModule.__gwt_getMetaProperty = function () {
        return null
      };
      var s = null;
      var t = o.__gwt_activeModules = o.__gwt_activeModules || {};
      t[M] = {
        moduleName: M
      };
      webModule.__moduleStartupDone = function (e) {
        var f = t[M].bindings;
        t[M].bindings = function () {
          var a = f ? f() : {};
          var b = e[webModule.__softPermutationId];
          for (var c = P; c < b.length; c++) {
            var d = b[c];
            a[d[P]] = d[Q]
          }
          return a
        }
      };
      var u;

      function v() {
        w();
        return u
      }

      function w() {
        if (u) {
          return
        }
        var a = p.createElement(R);
        a.id = M;
        a.style.cssText = S + T;
        a.tabIndex = -1;
        p.body.appendChild(a);
        u = a.contentWindow.document;
        u.open();
        var b = document.compatMode == U ? V : W;
        u.write(b + X);
        u.close()
      }

      function A(k) {
        function l(a) {
          function b() {
            if (typeof p.readyState == Y) {
              return typeof p.body != Y && p.body != null
            }
            return /loaded|complete/.test(p.readyState)
          }
          var c = b();
          if (c) {
            a();
            return
          }

          function d() {
            if (!c) {
              if (!b()) {
                return
              }
              c = true;
              a();
              if (p.removeEventListener) {
                p.removeEventListener(Z, d, false)
              }
              if (e) {
                clearInterval(e)
              }
            }
          }
          if (p.addEventListener) {
            p.addEventListener(Z, d, false)
          }
          var e = setInterval((function () {
            d()
          }), $)
        }

        function m(c) {
          function d(a, b) {
            a.removeChild(b)
          }
          var e = v();
          var f = e.body;
          var g;
          if (navigator.userAgent.indexOf(_) > -1 && window.JSON) {
            var h = e.createDocumentFragment();
            h.appendChild(e.createTextNode(ab));
            for (var i = P; i < c.length; i++) {
              var j = window.JSON.stringify(c[i]);
              h.appendChild(e.createTextNode(j.substring(Q, j.length - Q)))
            }
            h.appendChild(e.createTextNode(bb));
            g = e.createElement(cb);
            g.language = db;
            g.appendChild(h);
            f.appendChild(g);
            d(f, g)
          } else {
            for (var i = P; i < c.length; i++) {
              g = e.createElement(cb);
              g.language = db;
              g.text = c[i];
              f.appendChild(g);
              d(f, g)
            }
          }
        }
        webModule.onScriptDownloaded = function (a) {
          l((function () {
            m(a)
          }))
        };
        var n = p.createElement(cb);
        n.src = k;
        if (webModule.__errFn) {
          n.onerror = function () {
            webModule.__errFn(M, new Error(gb + code))
          }
        }
        p.getElementsByTagName(hb)[P].appendChild(n)
      }
      webModule.__startLoadingFragment = function (a) {
        return D(a)
      };
      webModule.__installRunAsyncCode = function (a) {
        var b = v();
        var c = b.body;
        var d = b.createElement(cb);
        d.language = db;
        d.text = a;
        c.appendChild(d);
        c.removeChild(d)
      };

      function B() {
        var c = {};
        var d;
        var e;
        var f = p.getElementsByTagName(ib);
        for (var g = P, h = f.length; g < h; ++g) {
          var i = f[g],
            j = i.getAttribute(jb),
            k;
          if (j) {
            j = j.replace(kb, W);
            if (j.indexOf(lb) >= P) {
              continue
            }
            if (j == mb) {
              k = i.getAttribute(nb);
              if (k) {
                var l, m = k.indexOf(ob);
                if (m >= P) {
                  j = k.substring(P, m);
                  l = k.substring(m + Q)
                } else {
                  j = k;
                  l = W
                }
                c[j] = l
              }
            } else if (j == pb) {
              k = i.getAttribute(nb);
              if (k) {
                try {
                  d = eval(k)
                } catch (a) {
                  alert(qb + k + rb)
                }
              }
            } else if (j == sb) {
              k = i.getAttribute(nb);
              if (k) {
                try {
                  e = eval(k)
                } catch (a) {
                  alert(qb + k + tb)
                }
              }
            }
          }
        }
        __gwt_getMetaProperty = function (a) {
          var b = c[a];
          return b == null ? null : b
        };
        s = d;
        webModule.__errFn = e
      }

      function C() {
        function e(a) {
          var b = a.lastIndexOf(ub);
          if (b == -1) {
            b = a.length
          }
          var c = a.indexOf(vb);
          if (c == -1) {
            c = a.length
          }
          var d = a.lastIndexOf(wb, Math.min(c, b));
          return d >= P ? a.substring(P, d + Q) : W
        }

        function f(a) {
          if (a.match(/^\w+:\/\//)) {} else {
            var b = p.createElement(xb);
            b.src = a + yb;
            a = e(b.src)
          }
          return a
        }

        function g() {
          var a = __gwt_getMetaProperty(zb);
          if (a != null) {
            return a
          }
          return W
        }

        function h() {
          var a = p.getElementsByTagName(cb);
          for (var b = P; b < a.length; ++b) {
            if (a[b].src.indexOf(Ab) != -1) {
              return e(a[b].src)
            }
          }
          return W
        }

        function i() {
          var a = p.getElementsByTagName(Bb);
          if (a.length > P) {
            return a[a.length - Q].href
          }
          return W
        }

        function j() {
          var a = p.location;
          return a.href == a.protocol + Cb + a.host + a.pathname + a.search + a.hash
        }
        var k = g();
        if (k == W) {
          k = h()
        }
        if (k == W) {
          k = i()
        }
        if (k == W && j()) {
          k = e(p.location.href)
        }
        k = f(k);
        return k
      }

      function D(a) {
        if (a.match(/^\//)) {
          return a
        }
        if (a.match(/^[a-zA-Z]+:\/\//)) {
          return a
        }
        return webModule.__moduleBase + a
      }

      function F() {
        var f = [];
        var g = P;

        function h(a, b) {
          var c = f;
          for (var d = P, e = a.length - Q; d < e; ++d) {
            c = c[a[d]] || (c[a[d]] = [])
          }
          c[a[e]] = b
        }
        var i = [];
        var j = [];

        function k(a) {
          var b = j[a](),
            c = i[a];
          if (b in c) {
            return b
          }
          var d = [];
          for (var e in c) {
            d[c[e]] = e
          }
          if (s) {
            s(a, d, b)
          }
          throw null
        }
        j[Db] = function () {
          var a = navigator.userAgent.toLowerCase();
          var b = p.documentMode;
          if (function () {
              return a.indexOf(Eb) != -1
            }()) return Fb;
          if (function () {
              return a.indexOf(Gb) != -1 && (b >= $ && b < Hb)
            }()) return Ib;
          if (function () {
              return a.indexOf(Gb) != -1 && (b >= Jb && b < Hb)
            }()) return Kb;
          if (function () {
              return a.indexOf(Gb) != -1 && (b >= Lb && b < Hb)
            }()) return Mb;
          if (function () {
              return a.indexOf(Nb) != -1 || b >= Hb
            }()) return Ob;
          return Fb
        };
        i[Db] = {
          gecko1_8: P,
          ie10: Q,
          ie8: Pb,
          ie9: Qb,
          safari: Rb
        };
        __gwt_isKnownPropertyValue = function (a, b) {
          return b in i[a]
        };
        webModule.__getPropMap = function () {
          var a = {};
          for (var b in i) {
            if (i.hasOwnProperty(b)) {
              a[b] = k(b)
            }
          }
          return a
        };
        webModule.__computePropValue = k;
        o.__gwt_activeModules[M].bindings = webModule.__getPropMap;
        if (q()) {
          return D(Tb)
        }
        var l;
        try {
          h([Ob], Ub);
          h([Ib], Ub + Vb);
          h([Kb], Ub + Wb);
          h([Fb], Ub + Xb);
          l = f[k(Db)];
          var m = l.indexOf(Yb);
          if (m != -1) {
            g = parseInt(l.substring(m + Q), $);
            l = l.substring(P, m)
          }
        } catch (a) {}
        webModule.__softPermutationId = g;
        return D(l + Zb)
      }

      function G() {
        if (!o.__gwt_stylesLoaded) {
          o.__gwt_stylesLoaded = {}
        }
      }
      B();
      webModule.__moduleBase = "https://www.geogebra.org/apps/5.0.793.0/" + name + "/";
      t[M].moduleBase = webModule.__moduleBase;
      var H = F();
      G();
      A(H);
      return true
    }
    return webModule
  };
  if (typeof window.web3d !== "function") {
    window.web3d = GGBAppletUtils.makeModule("web3d", "2E4AB5EF8F563036A0AFAADA47CC4EA4")
  }
  if (typeof window.webSimple !== "function") {
    window.webSimple = GGBAppletUtils.makeModule("webSimple", "52920F0331827B4A25CCA14713B131C1")
  }
  window.GGBApplet = GGBApplet
})();