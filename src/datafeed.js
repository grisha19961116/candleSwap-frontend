import {generateSymbol, makeApiRequest, resolutionToSeconds, tokenList, updateTokensList} from './helpers.js';
import {subscribeOnStream, unsubscribeFromStream,} from './streaming.js';

const ERC20_ABI = [{"inputs":[{"internalType":"address","name":"logic","type":"address"},{"internalType":"address","name":"admin","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"previousAdmin","type":"address"},{"indexed":false,"internalType":"address","name":"newAdmin","type":"address"}],"name":"AdminChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newAdmin","type":"address"}],"name":"changeAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"}],"name":"upgradeTo","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"stateMutability":"payable","type":"receive"}]

const getTokenSymbol = async (address) => {
    const provider = new ethers.providers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
    const TokenContract = new ethers.Contract(address, ERC20_ABI, provider);
    return TokenContract.symbol;
}

const lastBarsCache = new Map();

const configurationData = {
    supported_resolutions: ["10S", "15S", "30S", "1", "4", "8", "16"],
    exchanges: [{
        value: 'CandleSwap',
        name: 'CandleSwap',
        desc: 'CandleSwap',
    },
    ],
    symbols_types: [{
        name: 'crypto',
        value: 'crypto',
    },],
    currency_codes: ["USD", "EUR", "GBP"],
    supports_marks: true,
    supports_timescale_marks: true,
    supports_time: true,
};



async function getAllSymbols() {
    const data = await makeApiRequest('api/Pairs').then(response => response.data);
    console.log(tokenList.length)
    const libraryAddresses = new Set();
    data.forEach(pair => libraryAddresses.add(pair.token0Id).add(pair.token1Id))
    const libraryAddressesArray = Array.from(libraryAddresses.keys());
    let dataSymbols = await Promise.all(
        libraryAddressesArray.map(address => {
            const existingToken = tokenList.find(token => address === token.address)
            if(!existingToken) return getTokenSymbol(address);
            return existingToken.symbol
        })
    )
    // updateTokensList(tokenList, libraryAddressesArray, dataSymbols)
    let parsedData = data.map(pair => {
        const address1Index = libraryAddressesArray.findIndex(address => address === pair.token0Id)
        const address2Index = libraryAddressesArray.findIndex(address => address === pair.token1Id)
        return {
            token0Id: pair.token0Id,
            token1Id: pair.token1Id,
            token0Symbol: dataSymbols[address1Index],
            token1Symbol: dataSymbols[address2Index],
        }
    })
    parsedData = parsedData.filter(pair => pair.token0Symbol && pair.token1Symbol)
    let allSymbols = [];
    parsedData.forEach(pair => {
        const symbol = generateSymbol('CandleSwap', pair.token0Symbol, pair.token1Symbol);
        const newParsedSymbol = {
            symbol: symbol.short,
            full_name: symbol.full,
            description: symbol.short,
            exchange: "CandleSwap",
            type: "crypto",
        }
        allSymbols.push(newParsedSymbol);
    });
    console.log(allSymbols)
    return {symbols: allSymbols, symbolsAddresses: parsedData};
}

export default {
    onReady: (callback) => {
        console.log('[onReady]: Method call');
        setTimeout(() => callback(configurationData));
    },

    searchSymbols: async (
        userInput,
        exchange,
        symbolType,
        onResultReadyCallback,
    ) => {
        console.log('[searchSymbols]: Method call');
        const {symbols, symbolsAddresses} = await getAllSymbols();
        const newSymbols = symbols.filter(symbol => {
            const isExchangeValid = exchange === '' || symbol.exchange === exchange;
            const isFullSymbolContainsInput = symbol.full_name
                .toLowerCase()
                .indexOf(userInput.toLowerCase()) !== -1;
            return isExchangeValid && isFullSymbolContainsInput;
        });
        onResultReadyCallback(newSymbols);
    },

    resolveSymbol: async (
        symbolName,
        onSymbolResolvedCallback,
        onResolveErrorCallback,
    ) => {
        console.log('[resolveSymbol]: Method call', symbolName);
        const {symbols, symbolsAddresses} = await getAllSymbols();
        const symbolItem = symbols.find(({
                                             full_name,
                                         }) => full_name === symbolName);
        const symbolItemIndex = symbols.findIndex(({
                                                       full_name,
                                                   }) => full_name === symbolName);
		console.log(symbolItemIndex, symbolsAddresses)
        if (!symbolItem) {
            console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
            onResolveErrorCallback('cannot resolve symbol');
            return;
        }
        const symbolInfo = {
            ticker: symbolItem.full_name,
            name: symbolItem.symbol,
            description: symbolItem.description,
            type: symbolItem.type,
            session: '24x7',
            exchange: symbolItem.exchange,
            minmov: 1,
            pricescale: 1000000,
            timezone: 'Etc/UTC',
            has_intraday: true,
            has_seconds: true,
            has_no_volume: true,
            has_weekly_and_monthly: false,
            supported_resolutions: configurationData.supported_resolutions,
            volume_precision: 2,
            data_status: 'streaming',
			token0Id: symbolsAddresses[symbolItemIndex].token0Id,
			token1Id: symbolsAddresses[symbolItemIndex].token1Id,
        };

        console.log('[resolveSymbol]: Symbol resolved', symbolName);
        onSymbolResolvedCallback(symbolInfo);
    },

    getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
        const {from, to, firstDataRequest, countBack} = periodParams;
        console.log('[getBars]: Method call', symbolInfo, resolution, from, to);
        const urlParameters = {
            token0Id: symbolInfo.token0Id,
            token1Id: symbolInfo.token1Id,
            periodSeconds: resolutionToSeconds(resolution),
            startTime: from - 10000000,
            endTime: to,
            limit: 2000,
        };
        const query = Object.keys(urlParameters)
            .map(name => `${name}=${encodeURIComponent(urlParameters[name])}`)
            .join('&');
        try {
            const data = await makeApiRequest(`api/Candles?${query}`);
            if (data.status !== 200 || data.data.length === 0) {
                // "noData" should be set if there is no data in the requested period.
                onHistoryCallback([], {
                    noData: true,
                });
                return;
            }
            let bars = data.data.map(bar => ({
				time: bar.datetime * 1000,
				low: bar.low,
				high: bar.high,
				open: bar._open,
				close: bar.close,
			})).sort((a, b) => a.datetime > b.datetime ? 1 : -1);
            if (firstDataRequest) {
                lastBarsCache.set(symbolInfo.full_name, {
                    ...bars[bars.length - 1],
                });
            }
            console.log(`[getBars]: returned ${bars.length} bar(s)`);
            onHistoryCallback(bars, {
                noData: false,
            });
        } catch (error) {
            console.log('[getBars]: Get error', error);
            onErrorCallback(error);
        }
    },

    subscribeBars: (
        symbolInfo,
        resolution,
        onRealtimeCallback,
        subscribeUID,
        onResetCacheNeededCallback,
    ) => {
        console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID);
        subscribeOnStream(
            symbolInfo,
            resolution,
            onRealtimeCallback,
            subscribeUID,
            onResetCacheNeededCallback,
            lastBarsCache.get(symbolInfo.full_name),
        );
    },

    unsubscribeBars: (subscriberUID) => {
        console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
        unsubscribeFromStream(subscriberUID);
    },
};
