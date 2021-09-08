// Datafeed implementation, will be added later
import Datafeed from './datafeed.js';

function getParameterByName(name) {
	name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
		results = regex.exec(location.search);
	return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function initOnReady() {
	var widget = window.tvWidget = new TradingView.widget({
		// debug: true, // uncomment this line to see Library errors and warnings in the console
		fullscreen: true,
		symbol: 'CandleSwap:WBNB/USDT',
		interval: '30S',
		container: "tv_chart_container",
		timezone: 'Etc/UTC',

		datafeed: Datafeed,
		library_path: "charting_library/",
		locale: getParameterByName('lang') || "en",

		disabled_features: ["use_localstorage_for_settings"],
		charts_storage_url: 'https://saveload.tradingview.com',
		charts_storage_api_version: "1.1",
		client_id: 'tradingview.com',
		user_id: 'public_user_id',
		theme: "Dark",
		// custom_css_url: '../themed.css',
	});
};

window.addEventListener('DOMContentLoaded', initOnReady, false);
