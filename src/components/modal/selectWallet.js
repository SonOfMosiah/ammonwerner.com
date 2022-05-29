/* eslint-disable react/jsx-key */
/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import { connect } from 'react-redux'
import { ethers } from 'ethers'
import toLower from 'lodash/toLower'
import { useWeb3React } from '@web3-react/core'

import networkName from '../../helpers/web3/networkName'

import {
  injected,
  walletconnect,
  walletlink,
} from '../../helpers/web3/connectors'

var ConnectorNames;
(function (ConnectorNames) {
  ConnectorNames.Injected = 'Metamask'
  ConnectorNames.WalletConnect = 'WalletConnect'
  ConnectorNames.WalletLink = 'Coinbase'
})(ConnectorNames || (ConnectorNames = {}))

// Here you can change the order in which the wallets show up
const connectorsByName = {
  [ConnectorNames.Injected]: injected,
  [ConnectorNames.WalletConnect]: walletconnect,
  [ConnectorNames.WalletLink]: walletlink,
}

function SelectWallet (props) {
  // const {
  // } = props

  const {chainId, account, activate} = useWeb3React()

  const setNetwork = async (account, chainId) => {
    const network = await networkName(chainId)
  }
  const connect = async (connectorName) => {
    try {
      await activate(connectorName)
      await setNetwork(account, chainId)
    } catch (e) {
      console.log(e)
    }
  }
  const widthCompute = 'calc(50% - 8px) !important'
  return (
    <div>
      <div className='w-100 d-flex align-items-center justify-content-center p-3'>
        <ul className='list-group w-100 d-flex flex-row flex-wrap align-items-start'>
          {Object.keys(connectorsByName).map(name => {
            return (
              <li
                className='list-group-item w-50 list-group-item-button d-flex align-items-center justify-content-between mx-1' key={name}
                onClick={() => {
                  connect(connectorsByName[name])
                }}
              >
                <span>{name}</span>
                <img src={`/icons/${toLower(name.replace(/ /g, ''))}.png`} className='img-fluid img-fluid-icon' style={{ width: '32px' }} />
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

const mapStateToProps = state => ({
  currentAccount: state.global.currentAccount
})

const mapDispatchToProps = dispatch => ({
})

export default connect(mapStateToProps, mapDispatchToProps)(SelectWallet)
