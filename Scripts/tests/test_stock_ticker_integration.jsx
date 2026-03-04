/**
 * test_stock_ticker_integration.jsx
 *
 * End-to-end stock ticker builder validation without the UI panel.
 */

#include "../lib/io.jsxinc"
#include "../lib/helpers.jsxinc"
#include "../demos/stock_ticker/data_fetcher.jsxinc"
#include "../demos/stock_ticker/ticker_builder.jsxinc"

(function runStockTickerIntegrationTest() {
    function log(msg) {
        if (typeof $.writeln === "function") {
            $.writeln(msg);
        }
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || "Assertion failed");
        }
    }

    app.beginUndoGroup("Stock Ticker Integration Test");
    try {
        if (!app.project) {
            app.newProject();
        }

        var stockData = loadStockData(File($.fileName));
        var comp = createStockDashboardComp("Stock Ticker Integration", 999);
        var controlLayer = addTickerControlLayer(comp, {
            scrollSpeed: 200,
            chartDays: 30,
            lineWeight: 4,
            gainLoss: true,
            showGrid: true
        });
        var tickerInfo = buildTickerBar(comp, stockData);
        var sparklineInfo = buildSparkline(comp, stockData, 30);
        var tickerCount = 0;
        var i;

        buildGridLines(comp, stockData, 30);
        wireTickerExpressions(comp);

        assert(stockData.stocks.length === 8, "Expected 8 bundled stocks");
        assert(tickerInfo.sequenceWidth > 0, "Ticker sequence width should be positive");
        assert(sparklineInfo.layer !== null, "Sparkline should be created");

        for (i = 1; i <= tickerInfo.sourceComp.layers.length; i++) {
            if (tickerInfo.sourceComp.layers[i].name.indexOf("Ticker ") === 0) {
                tickerCount++;
            }
        }

        assert(tickerCount === stockData.stocks.length * 2, "Ticker bar should repeat stock entries twice");
        assert(comp.layer("Ticker Bar") !== null, "Ticker Bar layer should exist");
        assert(comp.layer("Sparkline") !== null, "Sparkline layer should exist");
        assert(comp.layer("Ticker Bar").property("Transform").property("Position").expression !== "", "Ticker scroll expression should be set");

        log("Stock ticker integration test passed for " + stockData.stocks.length + " stocks.");
    } finally {
        app.endUndoGroup();
    }
})();
