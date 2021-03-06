import { call, put, takeLatest } from 'redux-saga/effects'
import * as Action from './web3Actions'

const Web3 = require('web3');

/*
 * Initialization
 */
export function * initializeWeb3 (options) {
  try {
    yield put({ type: Action.WEB3_INITIALIZING });
    let web3 = {}

    if (window.ethereum) {
      const { ethereum } = window
      web3 = options.customProvider || new Web3(ethereum);
      try {
        yield call([ethereum, 'request'], { method: 'eth_requestAccounts' });

        yield put({ type: Action.WEB3_INITIALIZED, web3 })

        return web3
      } catch (error) {
        console.error(error);
        if(error.code === 4001){
          console.warn("User rejected MetaMask permission request");
          yield put({ type: Action.WEB3_USER_DENIED });
          if(options.retryPermissionDialog)
            return yield call(initializeWeb3, options);  // User rejected permission dialog, let's retry
        }
        else if (error.code === -32002)
          console.warn('Please accept the pending MetaMask permission request');

        yield put({ type: Action.WEB3_FAILED, error });
      }
    } else if (options.customProvider) {
        web3 = options.customProvider
        yield put({ type: Action.WEB3_INITIALIZED, web3 })
        return web3
    } else if (options.fallback) {
        // Attempt fallback if no web3 injection.
        switch (options.fallback.type) {
          case 'ws':
            const provider = new Web3.providers.WebsocketProvider(
              options.fallback.url
            )
            web3 = new Web3(provider)
            yield put({ type: Action.WEB3_INITIALIZED, web3 })
            return web3

          default:
            // Invalid options; throw.
            throw new Error('Invalid web3 fallback provided.')
        }
    } else {
        // Out of web3 options; throw.
        throw new Error('Cannot find injected web3 or valid fallback.')
    }
  } catch (error) {
    yield put({ type: Action.WEB3_FAILED, error })
    console.error('Error intializing web3:')
    console.error(error)
  }
}

/*
 * Fetch Network Information
 */
export function * getNetworkInfo ({ web3 }) {
  try {
    const networkId = yield call(web3.eth.net.getId);
    const chainId = yield call(web3.eth.getChainId);
    const nodeInfo = yield call(web3.eth.getNodeInfo);

    const networkInfo = { networkId, chainId, nodeInfo };

    yield put({ type: Action.WEB3_NETWORK_FETCHED, networkInfo });

    return networkInfo;
  } catch (error) {
    yield put({ type: Action.WEB3_NETWORK_FAILED, error });

    console.error('Error fetching network information:');
    console.error(error);
  }
}

function * web3Saga () {
  yield takeLatest(Action.WEB3_NETWORK_FETCHING, getNetworkInfo);
}

export default web3Saga;

