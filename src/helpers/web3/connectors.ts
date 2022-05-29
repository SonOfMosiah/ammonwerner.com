import { InjectedConnector } from '@web3-react/injected-connector'
import { WalletConnectConnector } from '@web3-react/walletconnect-connector'
import { WalletLinkConnector } from '@web3-react/walletlink-connector'
import { ChainId } from './chainId'
// import { UAuthConnector } from '@uauth/web3-react'

import RPC from './rpc'

const supportedChainIds = Object.values(ChainId) as number[]

// const POLLING_INTERVAL = 12000

export const injected = new InjectedConnector({ supportedChainIds: supportedChainIds })

export const walletconnect = new WalletConnectConnector({
  infuraId: process.env.REACT_APP_INFURA_ID!,
  qrcode: true
})

export const walletlink = new WalletLinkConnector({
  url: process.env.ALCHEMY_KEY,
  appName: 'web3-react example'
})

// export const uauth = new UAuthConnector({
//   clientID: process.env.UNSTOPPABLE_DOMAINS_CLIENT_ID!,
//   clientSecret: process.env.UNSTOPPABLE_DOMAINS_CLIENT_SECRET!,
//   redirectUri: process.env.UNSTOPPABLE_DOMAINS_REDIRECT_URI!,
//   postLogoutRedirectUri: process.env.UNSTOPPABLE_DOMAINS_POST_LOGOUT_REDIRECT_URI!,
//   // Scope must include openid and wallet
//   scope: 'openid wallet',

//   // Injected and walletconnect connectors are required.
//   connectors: { injected, walletconnect }
// })
