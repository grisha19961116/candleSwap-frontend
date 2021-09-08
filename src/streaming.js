import {resolutionToSeconds} from './helpers.js';

const socket = new WebSocket('wss://candleswap-api.azurewebsites.net/socket');
const channelToSubscription = new Map();

socket.onopen = () => {
	console.log('[socket] Connected');
};

socket.onclose = (reason) => {
	console.log('[socket] Disconnected:', reason.reason);
};

socket.onerror = (error) => {
	console.log('[socket] Error:', error.message);
};

socket.onmessage = (data) => {
	console.log('[socket] Message:', data.data);
	if (data.data === "Uniswap Heartbeat" || data.data.includes('"event":"subscribe"')) {
		// skip all non-TRADE events
		return;
	}

	const parsedData ={};
	data.data.split(';').forEach(keyValue => {
		let pair = keyValue.trim().split(':');
		parsedData[pair[0]] = pair[1]
	});

	const tradePriceOpen = parseFloat(parsedData['_open']);
	const tradePriceClose = parseFloat(parsedData.close);
	const tradePriceLow = parseFloat(parsedData.low);
	const tradePriceHigh = parseFloat(parsedData.high);
	const tradeTime = parseInt(parsedData.datetime);
	const chanelMessage = JSON.stringify({
		"event": "subscribe",
		"channel": "candles",
		"key": `trade:${parsedData.resolutionSeconds}:${parsedData.token0Id}:${parsedData.token1Id}`
	});
	const subscriptionItem = channelToSubscription.get(chanelMessage);
	if (subscriptionItem === undefined) {
		return;
	}
	// const lastDailyBar = subscriptionItem.lastDailyBar;
	// const nextDailyBarTime = getNextDailyBarTime(lastDailyBar.time);

	let bar = {
		time: tradeTime * 1000,
		open: tradePriceOpen,
		high: tradePriceHigh,
		low: tradePriceLow,
		close: tradePriceClose,
	};
	subscriptionItem.lastDailyBar = bar;

	// send data to every subscriber of that symbol
	subscriptionItem.handlers.forEach(handler => handler.callback(bar));
};

function getNextDailyBarTime(barTime) {
	const date = new Date(barTime * 1000);
	date.setDate(date.getDate() + 1);
	return date.getTime() / 1000;
}

export function subscribeOnStream(
	symbolInfo,
	resolution,
	onRealtimeCallback,
	subscribeUID,
	onResetCacheNeededCallback,
	lastDailyBar,
) {
	const chanelMessage = JSON.stringify({
		"event": "subscribe",
		"channel": "candles",
		"key": `trade:${resolutionToSeconds(resolution)}:${symbolInfo.token0Id}:${symbolInfo.token1Id}`
	});
	const handler = {
		id: subscribeUID,
		callback: onRealtimeCallback,
	};
	let subscriptionItem = channelToSubscription.get(chanelMessage);
	if (subscriptionItem) {
		// already subscribed to the channel, use the existing subscription
		subscriptionItem.handlers.push(handler);
		return;
	}
	subscriptionItem = {
		subscribeUID,
		resolution,
		lastDailyBar,
		handlers: [handler],
	};
	channelToSubscription.set(chanelMessage, subscriptionItem);
	console.log('[subscribeBars]: Subscribe to streaming. Channel:', chanelMessage);
	socket.send(chanelMessage);
}

export function unsubscribeFromStream(subscriberUID) {
	// find a subscription with id === subscriberUID
	for (const channelString of channelToSubscription.keys()) {
		const subscriptionItem = channelToSubscription.get(channelString);
		const handlerIndex = subscriptionItem.handlers
			.findIndex(handler => handler.id === subscriberUID);
		let channelStringUnsubscribe = JSON.parse(channelString);
		channelStringUnsubscribe["event"] = "unsubscribe";
		channelStringUnsubscribe = JSON.stringify(channelStringUnsubscribe);

		if (handlerIndex !== -1) {
			// remove from handlers
			subscriptionItem.handlers.splice(handlerIndex, 1);

			if (subscriptionItem.handlers.length === 0) {
				// unsubscribe from the channel, if it was the last handler
				console.log('[unsubscribeBars]: Unsubscribe from streaming. Channel:', channelStringUnsubscribe);
				socket.send(channelStringUnsubscribe);
				channelToSubscription.delete(channelString);
				break;
			}
		}
	}
}
