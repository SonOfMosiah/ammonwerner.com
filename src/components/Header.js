import React, { useState, useEffect } from 'react'
import { ethers, BigNumber } from 'ethers'
import Link from 'next/link'
import SVGLogoAltafin from './svg-logo'
import get from 'lodash/get'
import includes from 'lodash/includes'
import filter from 'lodash/filter'
import isNil from 'lodash/isNil'
import Flags from 'country-flag-icons/react/1x1'
import LocaleCode from 'locale-code'
import { useRouter } from 'next/router'
import { connect } from 'react-redux'
import { useWeb3React } from '@web3-react/core'
import accounting from 'accounting-js'
import log from 'ololog'
import UAuth from '@uauth/js'

import { setCurrentAccount, openModal } from '../redux/action/global'

import networkName from '../helpers/web3/networkName'
import { injected } from '../helpers/web3/connectors'
import { analyticsEvent } from '../helpers/google/analytics'

import SelectWallet from './modal/selectWallet'

function Header (props) {
  const router = useRouter()
  const {
    header,
    page,
    transparent,
    openModal,
    currentAccount,
    currentNetwork,
    setCurrentAccount,
    forceLightMode,
    forceDarkMode
  } = props
  const [menu, setMenu] = useState([])
  const [mobileActive, setMobileActive] = useState(false)
  const [dropdown, setDropdown] = useState({})
  const [mode, setMode] = useState('dark')
  const {library, chainId, account, active, activate } = useWeb3React()
  const trackEvent = (category, action, label, nonInteraction) => {
    analyticsEvent(category, action, label, nonInteraction)
    setMobileActive(false)
  }
  const onSelectMode = (mode) => {
    setMode(mode)
      if (typeof window !== 'undefined') {
        if (mode === 'light') { 
          document.body.classList.add('light-mode')
          window.localStorage.setItem('theme', mode);
        } else { 
          document.body.classList.remove('light-mode')
          window.localStorage.setItem('theme', 'dark');
        }
      }
  }
  const setNetwork = async (account, chainId) => {
    let udConnector = false
    let unstoppable
    const uauth = new UAuth({
      clientID: process.env.UNSTOPPABLE_DOMAINS_CLIENT_ID,
      redirectUri: process.env.UNSTOPPABLE_DOMAINS_REDIRECT_URI,
    })
    await uauth.user()
    .then((user) => {
      udConnector = true
      unstoppable = user
    })
    .catch(() => {})
    const network = networkName(chainId)
    if (udConnector) {
      setCurrentAccount({
        account: unstoppable.sub,
        provider: network
      })
    } else {
      if (chainId === 1 || chainId === 3 || chainId === 137) {
        try {
          const provider = ethers.getDefaultProvider(0x1, {
            alchemy: process.env.ALCHEMY_KEY //network['ethereum'].endpoint
          })
          const ens = await provider.lookupAddress(account)
          if (!isNil(ens)) {
            setCurrentAccount({
              account: ens,
              provider: network
            })
            window.Intercom('update', {
              user_id: ens
            })
          } else {
            setCurrentAccount({
              account: account,
              provider: network
            })
            window.Intercom('update', {
              user_id: account
            })
          }
        } catch (e) {
          log.red.error(e)
        }
      } else {
        setCurrentAccount({
          account: account,
          provider: network
        })
        window.Intercom('update', {
          user_id: account
        })
      }
    }
  }
  const checkIfWalletIsConnected = async () => {
    try {
      if (account) {
        setNetwork(account, chainId)
      } else {
        if(process.env.NODE_ENV === 'development') {
          await activate(injected)
        } else {
          setCurrentAccount('')
        }
      }
    } catch (error) {
      log.red(error)
    }
  }
  const openModalWallet = () => {
    openModal({
      title: get(page, 'fields.selectWallet', 'Select Wallet'),
      size: 'md',
      component: <SelectWallet />
    })
  }
  const addAltaEthereum = async () => {
    const { ethereum } = window
    if (ethereum) {
      try {
        const altaAdded = await ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: currentNetwork.contracts.alta,
              symbol: 'ALTA',
              decimals: 18,
              image: 'https://app.alta.finance/altafin_afn_512.png'
            }
          }
        })
      } catch (error) {
        log.red(error)
      }
    }
  }
  useEffect(() => {
    setMenu(get(filter(header, { sys: { id: '6tWiIlcoVZ5cbA9h7Zcweb' } }), '[0].fields.link', ''))
    setDropdown({})
  }, [header])
  useEffect(() => {
    checkIfWalletIsConnected()
  }, [account, chainId])
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let localTheme = window.localStorage.getItem('theme')
      onSelectMode(localTheme)
    }
  }, [])
  return (
    <header className={`header d-flex align-items-center justify-content-between w-100 ${transparent && 'header-transparent'} ${forceLightMode && 'header-force-light-mode'} ${forceDarkMode && 'header-force-dark-mode'} ${mobileActive ? 'active' : ''}`}>
      <div className='navbar-toggle' onClick={() => setMobileActive(true)}>
        <i className='far fa-bars' />
      </div>
      <Link href='/earn'>
        <a className='navbar-brand navbar-brand-mobile' onClick={() => setMobileActive(false)}>
          <SVGLogoAltafin />
        </a>
      </Link>
      <nav className='navbar navbar-expand-lg navbar-light bg-transparent w-100'>
        <Link href='/earn'>
          <a className='navbar-brand' onClick={() => setMobileActive(false)}>
            <SVGLogoAltafin />
          </a>
        </Link>
        <ul className='nav mr-2 mr-md-auto align-items-center'>
          {menu.length > 0 && menu.map(link => {
            if(get(link, 'fields.link', []).length > 0) {
              return (
                <li className='nav-item dropdown mx-3 mx-md-0' key={link.sys.id}>
                  <a className='nav-link p-0 cursor-pointer text-size-sm' onClick={() => setDropdown({ [link.sys.id]: !dropdown[link.sys.id] })}>{link.fields.text}</a>
                  <div className={`dropdown-menu shadow-lg border-0 ${get(dropdown, [link.sys.id], '') === true ? 'show' : ''}`}>
                    {link.fields.link.map(linkInner =>
                      <Link className='nav-link' href={linkInner.fields.url} as={linkInner.fields.url}>
                        <a className='dropdown-item d-flex align-items-center justify-content-start text-size-sm pl-3' onClick={() => trackEvent(`Nav: ${linkInner.fields.text}`)}>{linkInner.fields.text}</a>
                      </Link>  
                    )}
                  </div>
                </li>
              )
            } else {
              return (
                <li className={`nav-item mx-3 mx-md-0 ${includes(router.asPath, link.fields.url) && 'nav-item-active'}`} key={`${link.sys.id}+${link.fields.url}`}>
                  <Link href={link.fields.url} as={link.fields.url}>
                    <a className='nav-link p-0 text-size-sm' onClick={() => trackEvent(`Nav: ${link.fields.text}`)}>{link.fields.text}</a>
                  </Link>
                </li>
              )
            }
          })}
        </ul>
        <ul className='nav nav-sub mr-2 align-items-center'>
          {active && (currentAccount.provider !== 'solana') && <li className='nav-item nav-item-tooltip p-0 ml-2 mr-4' onClick={addAltaEthereum}>
            <img src='/altafin_afn_512.png' className='img-fluid' style={{ height: '30px', marginTop: '-2px' }} />
            <span className='nav-tooltip'>
              {get(page, 'fields.headerAddAfn', 'Add ALTA to your MetaMask wallet.')}
            </span>
          </li>}
          {active && get(currentAccount, 'account', '').length > 0 && <li className='nav-item nav-account nav-item-active'>
            <a className='nav-link p-0 text-size-sm'>
              <span className='text-capitalize font-weight-regular mr-3'>{currentAccount.provider}</span>
              <br className='d-block d-md-none' />{currentAccount.account}
            </a>
          </li>}
          {!active && <li className='nav-item'>
            <a className='nav-link p-0 cursor-pointer text-size-sm' onClick={openModalWallet}>
              {get(page, 'connectToWallet', 'Connect To Wallet')}
            </a>
          </li>}
          <li className='nav-item dropdown mt-2 mt-md-0'>
            <a
              className='nav-link p-0 cursor-pointer text-size-sm'
              onClick={() => setDropdown({ language: !dropdown.language })}
            >
              {LocaleCode.getLanguageNativeName(router.locale)}
              <i className='far fa-chevron-down ml-1' />
            </a>
            <div className={`dropdown-menu shadow-lg border-0 ${get(dropdown, 'language', '') === true ? 'show' : ''}`}>
              <Link href={router.pathname} locale='en-US'>
                <a className='dropdown-item d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                  <div className='icon-flag shadow-sm mr-3' locale='en-US'><Flags.US /></div>
                  {LocaleCode.getLanguageNativeName('en-US')}
                </a>
              </Link>
              <Link href={router.pathname} locale='es-ES'>
                <a className='dropdown-item d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                  <div className='icon-flag shadow-sm mr-3' locale='es-ES'><Flags.ES /></div>
                  {LocaleCode.getLanguageNativeName('es-ES')}
                </a>
              </Link>
              <Link href={router.pathname} locale='pt-PT'>
                <a className='dropdown-item d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                  <div className='icon-flag shadow-sm mr-3' locale='pt-PT'><Flags.PT /></div>
                  {LocaleCode.getLanguageNativeName('pt-PT')}
                </a>
              </Link>
              <Link href={router.pathname} locale='fr-FR'>
                <a className='dropdown-item d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                  <div className='icon-flag shadow-sm mr-3' locale='fr-FR'><Flags.FR /></div>
                  {LocaleCode.getLanguageNativeName('fr-FR')}
                </a>
              </Link>
              <Link href={router.pathname} locale='ko-KR'>
                <a className='dropdown-item d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                  <div className='icon-flag shadow-sm mr-3' locale='ko-KR'><Flags.KR /></div>
                  {LocaleCode.getLanguageNativeName('ko-KR')}
                </a>
              </Link>
              <Link href={router.pathname} locale='ja-JP'>
                <a className='dropdown-item d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                  <div className='icon-flag shadow-sm mr-3' locale='ja-JP'><Flags.JP /></div>
                  {LocaleCode.getLanguageNativeName('ja-JP')}
                </a>
              </Link>
              <Link href={router.pathname} locale='zh-CN'>
                <a className='dropdown-item d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                  <div className='icon-flag shadow-sm mr-3'><Flags.CN /></div>
                  {LocaleCode.getLanguageNativeName('zh-CN')}
                </a>
              </Link>
            </div>
          </li>
          <li className='nav-item dropdown mt-2 mt-md-0 '>
            <a
              className='nav-link p-0 cursor-pointer text-size-sm text-uppercase'
              onClick={() => setDropdown({ profile: !dropdown.profile })}
            >
              <i className='fas fa-th' />
            </a>
            <div className={`dropdown-menu shadow-lg border-0 ${get(dropdown, 'profile', '') === true ? 'show' : ''}`}>
              {get(page, 'headerSubMenu', []).length > 0 && page.headerSubMenu.map(link => {
                if (link.fields.external) {
                  return (
                    <a href={link.fields.url} key={`${link.sys.id}+${link.fields.url}`} className='dropdown-item dropdown-item-main d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                      {link.fields.text}
                    </a>
                  )
                } else {
                  return (
                    <Link href={link.fields.url} as={link.fields.url}>
                      <a className='dropdown-item dropdown-item-main d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>{link.fields.text}</a>
                    </Link>
                  )
                }
              })}
              <span className='dropdown-item dropdown-item-main d-flex align-items-center justify-content-start pl-3' onClick={() => setMobileActive(false)}>
                V{page.headerVersion}
              </span>
            </div>
          </li>
          {mode === 'dark' ? <li className='nav-item mt-2 mt-md-0 cursor-pointer' onClick={() => onSelectMode('light')}><a className='nav-link p-0 cursor-pointer text-size-sm'><i className='far fa-sun' /></a></li>
            : <li className='nav-item mt-2 mt-md-0 cursor-pointer' onClick={() => onSelectMode('dark')}><a className='nav-link p-0 cursor-pointer text-size-sm'><i className='far fa-moon' /></a></li>}

        </ul>
        <div className='btn-group btn-group-sm'>
          <a onClick={() => setMobileActive(false)}><button type='button' className='btn btn-sm btn-outline-light px-3 d-block d-md-none'><i className='far fa-times' /></button></a>
        </div>
      </nav>
    </header>
  )
}

const mapStateToProps = state => ({
  currentAccount: state.global.currentAccount,
  currentNetwork: state.global.currentNetwork
})

const mapDispatchToProps = dispatch => ({
  openModal: (modal) => dispatch(openModal(modal)),
  setCurrentAccount: (currentAccount) => dispatch(setCurrentAccount(currentAccount))
})

export default connect(mapStateToProps, mapDispatchToProps)(Header)
