/**
 * stock_ticker_panel.jsx
 *
 * Dockable ScriptUI panel for building a stock ticker + sparkline dashboard.
 */

#include "../../lib/io.jsxinc"
#include "../../lib/helpers.jsxinc"
#include "data_fetcher.jsxinc"
#include "ticker_builder.jsxinc"

(function (thisObj) {
    var PANEL_TITLE = "Stock Ticker";
    var latestComp = null;
    var latestData = null;

    function ensureProject() {
        if (!app.project) {
            throw new Error("Open After Effects with a project loaded first.");
        }
        return app.project;
    }

    function isValidComp(comp) {
        try {
            return !!(comp && comp instanceof CompItem && comp.name);
        } catch (_) {
            return false;
        }
    }

    function nowStamp() {
        var d = new Date();
        function pad(n) {
            return (n < 10 ? "0" : "") + n;
        }
        return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function addSliderRow(parent, label, min, max, defaultVal, decimalPlaces) {
        var row = parent.add("group");
        var labelText = row.add("statictext", undefined, label);
        var slider = row.add("slider", undefined, defaultVal, min, max);
        var valueText = row.add("statictext", undefined, defaultVal.toFixed(decimalPlaces));
        row.orientation = "row";
        row.alignChildren = ["fill", "center"];
        labelText.characters = 12;
        slider.preferredSize.width = 160;
        valueText.characters = 6;
        slider.onChanging = function () {
            valueText.text = slider.value.toFixed(decimalPlaces);
        };
        return { slider: slider, valueText: valueText };
    }

    var win;
    try {
        win = (thisObj instanceof Panel) ? thisObj :
            new Window("palette", PANEL_TITLE, undefined, { resizeable: true });
    } catch (_) {
        win = new Window("palette", PANEL_TITLE, undefined, { resizeable: true });
    }

    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.spacing = 8;
    win.margins = 12;

    var header = win.add("panel", undefined, PANEL_TITLE);
    header.orientation = "column";
    header.alignChildren = ["fill", "top"];
    header.margins = 10;
    header.add("statictext", undefined, "Build a scrolling ticker bar and featured sparkline from bundled or live stock data.");

    var buildBtn = win.add("button", undefined, "Build Ticker");

    var controlsPanel = win.add("panel", undefined, "Controls");
    controlsPanel.orientation = "column";
    controlsPanel.alignChildren = ["fill", "top"];
    controlsPanel.margins = 10;

    var scrollRow = addSliderRow(controlsPanel, "Scroll Speed", 50, 500, 200, 0);
    var daysRow = addSliderRow(controlsPanel, "Chart Days", 7, 90, 30, 0);
    var lineWeightRow = addSliderRow(controlsPanel, "Line Weight", 2, 8, 4, 0);

    var gainLossCheckbox = controlsPanel.add("checkbox", undefined, "Gain/Loss Colors");
    gainLossCheckbox.value = true;
    var showGridCheckbox = controlsPanel.add("checkbox", undefined, "Show Grid");
    showGridCheckbox.value = true;

    var updateSparklineBtn = win.add("button", undefined, "Update Sparkline");
    updateSparklineBtn.enabled = false;

    var dataPanel = win.add("panel", undefined, "Data");
    dataPanel.orientation = "column";
    dataPanel.alignChildren = ["fill", "top"];
    dataPanel.margins = 10;

    var fetchBtn = dataPanel.add("button", undefined, "Fetch Live Data");
    var apiKeyRow = dataPanel.add("group");
    apiKeyRow.add("statictext", undefined, "API Key");
    var apiKeyInput = apiKeyRow.add("edittext", undefined, "");
    apiKeyInput.characters = 24;

    var statusText = dataPanel.add("statictext", undefined, "Status: Using bundled data");
    statusText.alignment = ["fill", "top"];

    var activityPanel = win.add("panel", undefined, "Activity");
    activityPanel.orientation = "column";
    activityPanel.alignChildren = ["fill", "fill"];
    activityPanel.margins = 10;
    activityPanel.preferredSize.height = 120;
    var logList = activityPanel.add("listbox", undefined, [], { multiselect: false });
    logList.preferredSize.height = 88;

    function pushLog(message) {
        var item = logList.add("item", nowStamp() + "  " + message);
        if (logList.items.length > 18) {
            logList.remove(logList.items[0]);
        }
        try { logList.selection = item; } catch (_) {}
    }

    function setStatus(message, color) {
        statusText.text = "Status: " + message;
        try {
            var graphics = statusText.graphics;
            graphics.foregroundColor = graphics.newPen(graphics.PenType.SOLID_COLOR, color || [0.92, 0.92, 0.92], 1);
        } catch (_) {}
    }

    function currentSettings() {
        return {
            scrollSpeed: Math.round(scrollRow.slider.value),
            chartDays: Math.round(daysRow.slider.value),
            lineWeight: Math.round(lineWeightRow.slider.value),
            gainLoss: gainLossCheckbox.value,
            showGrid: showGridCheckbox.value
        };
    }

    function findControlLayer() {
        if (!isValidComp(latestComp)) {
            return null;
        }
        return latestComp.layer(TICKER_CTRL.LAYER_NAME);
    }

    function updateControlLayer() {
        var controlLayer = findControlLayer();
        var settings = currentSettings();
        if (!controlLayer) {
            setStatus("Build a ticker first to use live controls.", [0.9, 0.45, 0.15]);
            return null;
        }
        setTickerControlValue(controlLayer, TICKER_CTRL.SCROLL_SPEED, settings.scrollSpeed);
        setTickerControlValue(controlLayer, TICKER_CTRL.CHART_DAYS, settings.chartDays);
        setTickerControlValue(controlLayer, TICKER_CTRL.LINE_WEIGHT, settings.lineWeight);
        setTickerControlValue(controlLayer, TICKER_CTRL.GAIN_LOSS, settings.gainLoss ? 1 : 0);
        setTickerControlValue(controlLayer, TICKER_CTRL.SHOW_GRID, settings.showGrid ? 1 : 0);
        return settings;
    }

    function rebuildFromData(stockData) {
        var settings = updateControlLayer();
        if (!settings) {
            return;
        }
        removeTickerLayers(latestComp);
        removeSparklineLayers(latestComp);
        buildTickerBar(latestComp, stockData);
        buildSparkline(latestComp, stockData, settings.chartDays);
        buildGridLines(latestComp, stockData, settings.chartDays);
        wireTickerExpressions(latestComp);
    }

    function runAction(label, fn) {
        try {
            app.beginUndoGroup(label);
            var result = fn();
            app.endUndoGroup();
            return result;
        } catch (e) {
            try { app.endUndoGroup(); } catch (_) {}
            setStatus(label + " failed: " + e.toString(), [0.85, 0.2, 0.2]);
            alert(label + " failed.\n\n" + e.toString());
            return null;
        }
    }

    buildBtn.onClick = function () {
        runAction("Build Ticker", function () {
            var settings = currentSettings();
            var controlLayer;
            ensureProject();
            latestData = loadStockData(File($.fileName));
            latestComp = createStockDashboardComp();
            controlLayer = addTickerControlLayer(latestComp, settings);
            setTickerControlValue(controlLayer, TICKER_CTRL.GAIN_LOSS, settings.gainLoss ? 1 : 0);
            setTickerControlValue(controlLayer, TICKER_CTRL.SHOW_GRID, settings.showGrid ? 1 : 0);
            buildTickerBar(latestComp, latestData);
            buildSparkline(latestComp, latestData, settings.chartDays);
            buildGridLines(latestComp, latestData, settings.chartDays);
            wireTickerExpressions(latestComp);
            updateSparklineBtn.enabled = true;
            setStatus("Built ticker for " + latestData.stocks.length + " stocks", [0.2, 0.75, 0.35]);
            pushLog("Built ticker comp " + latestComp.name);
        });
    };

    updateSparklineBtn.onClick = function () {
        runAction("Update Sparkline", function () {
            var settings;
            if (!isValidComp(latestComp) || !latestData) {
                throw new Error("Build a ticker first.");
            }
            settings = updateControlLayer();
            rebuildSparkline(latestComp, latestData, settings.chartDays);
            setStatus("Updated sparkline to " + settings.chartDays + " days", [0.2, 0.75, 0.35]);
            pushLog("Rebuilt sparkline for " + settings.chartDays + " days");
        });
    };

    fetchBtn.onClick = function () {
        runAction("Fetch Live Data", function () {
            var apiKey = safeTrim(apiKeyInput.text);
            if (!apiKey) {
                throw new Error("Enter an Alpha Vantage API key first.");
            }
            latestData = fetchLiveData(File($.fileName), apiKey);
            setStatus("Fetched live data for " + latestData.stocks.length + " stocks", [0.2, 0.75, 0.35]);
            pushLog("Fetched live stock data");
            if (isValidComp(latestComp)) {
                rebuildFromData(latestData);
                pushLog("Rebuilt ticker comp with live data");
            }
        });
    };

    scrollRow.slider.onChanging = function () {
        scrollRow.valueText.text = scrollRow.slider.value.toFixed(0);
        if (updateControlLayer()) {
            setStatus("Updated scroll speed", [0.2, 0.75, 0.35]);
        }
    };

    lineWeightRow.slider.onChanging = function () {
        lineWeightRow.valueText.text = lineWeightRow.slider.value.toFixed(0);
        if (updateControlLayer()) {
            setStatus("Updated line weight", [0.2, 0.75, 0.35]);
        }
    };

    gainLossCheckbox.onClick = function () {
        if (updateControlLayer()) {
            setStatus("Updated gain/loss colors", [0.2, 0.75, 0.35]);
        }
    };

    showGridCheckbox.onClick = function () {
        if (updateControlLayer()) {
            setStatus("Updated grid visibility", [0.2, 0.75, 0.35]);
        }
    };

    win.onResizing = win.onResize = function () {
        this.layout.resize();
    };

    if (win instanceof Window) {
        win.center();
        win.show();
    } else {
        win.layout.layout(true);
    }
})(this);
