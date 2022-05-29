import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import Router from 'next/router'
import moment from 'moment'
import numeral from 'numeral'
import get from 'lodash/get'
import isNil from 'lodash/isNil'
import filter from 'lodash/filter'
import includes from 'lodash/includes'
import compact from 'lodash/compact'
import map from 'lodash/map'
import BN from 'bignumber.js'
import { ethers, BigNumber } from 'ethers'
import { createAlchemyWeb3 } from '@alch/alchemy-web3'
import { useWeb3React } from '@web3-react/core'
import { ApolloClient, InMemoryCache, gql, createHttpLink } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import ReactGA from 'react-ga4'
import log from 'ololog'

import { abiEvmEarn } from '../../helpers/abi/evmEarn'
import { abiErc20 } from '../../helpers/abi/erc20'
import { contentfulOptions } from '../../helpers/contentful/api'
import networkName from '../../helpers/web3/networkName'

import { closeModal, openModal } from '../../redux/action/global'

import SelectWallet from './selectWallet'
import Loader from '../loader'
import Select from '../select'

function EarnCreate (props) {
  const {
    data,
    currentNetwork,
    network,
    assets,
    page,
    agreement,
    earnTerms,
    openModal,
    closeModal
  } = props
  const [amount, setAmount] = useState('')
  const [amountWei, setAmountWei] = useState(0)
  const [amountError, setAmountError] = useState(false)
  const [amountAltaStake, setAmountAltaStake] = useState(0)
  const [assetBaseList, setAssetBaseList] = useState([])
  const [assetBase, setAssetBase] = useState({})
  const [assetBaseError, setAssetBaseError] = useState(false)
  const [earnTermId, setEarnTermId] = useState(null)
  const [earnTermList, setEarnTermList] = useState(null)
  const [earnTiers, setEarnTiers] = useState(null)
  const [earnInterestBase, setEarnInterestBase] = useState(0)
  const [earnInterestBonus, setEarnInterestBonus] = useState(0)
  const [earnInterestMultiplier, setEarnInterestMultiplier] = useState(1)
  const [paybackDate, setPaybackDate] = useState(new Date())
  const [approvedBase, setApprovedBase] = useState(false)
  const [approvedAlta, setApprovedAlta] = useState(false)
  const [transactionPending, setTransactionPending] = useState(false)
  const [quote, setQuote] = useState(null)
  const [tokenAddress] = useState(currentNetwork.contracts.alta)
  const [swapTarget, setSwapTarget] = useState(null)
  const [swapCallData, setSwapCallData] = useState(null)
  const { connector, library, chainId, account, activate, deactivate, active, error } = useWeb3React()
  const openModalWallet = () => {
    openModal({
      title: get(page, 'selectWallet', 'Select Wallet'),
      size: 'md',
      component: <SelectWallet />
    })
  }
  const getAssetList = async () => {
    const assetList = map(Object.entries(assets), (o) => { 
      return {
        iconUrl: o[1].logo,
        title: o[1].ticker,
        value: o[0],
        network: o[1].network
      }
    })
    const assetFilter = compact(map(assetList, (a) => {
      if(includes(a.network, chainId)) {
        return a
      } else {
        return null
      }
    }))
    setAssetBaseList(assetFilter)
    setAssetBase(assetFilter[0])
    checkIfWalletIsApprovedBase()
  }
  const getQuote = async () => {
    const amountWei = BN(amount * (10 ** 18))
    calculateInterest(amountWei.toString())
  }
  const calculateInterest = (amountWei) => {
    let tier = 1.00
    if(!isNil(earnTiers) && earnTiers[1] === amountAltaStake)   { tier = 1.15 }
    if(!isNil(earnTiers) && earnTiers[2] === amountAltaStake)   { tier = 1.30 }
    const term = earnTermList[earnTermId]
    const earnContractInterestBonus = Number(amount) * Number(term.altaRatio) / (10 ** 4)
    const earnContractInterest = (Number(term.time) * amount) * Number(term.interestRate * tier) / (10 ** 4) / 365
    setEarnInterestBonus(earnContractInterestBonus)
    setEarnInterestBase(earnContractInterest)
    setEarnInterestMultiplier(tier)
  }
  const calculateCloseDate = () => {
    var dateFuture = moment().add(earnTermList[earnTermId][0], 'days')
    setPaybackDate(moment(dateFuture).format('MM-DD-YYYY'))
  }
  const checkIfWalletIsApprovedAlta = async () => {
    try {
      if (active) {
        const signer = library.getSigner()
        const contractAlta = new ethers.Contract(currentNetwork.contracts.alta, abiErc20, signer)
        const allowanceAlta = await contractAlta.allowance(account, currentNetwork.contracts.earn)
        checkIfWalletIsApprovedBase()
        if (allowanceAlta > 0) {
          setApprovedAlta(true)
        } else {
          setApprovedAlta(false)
        }
      }
    } catch (error) {
      log.red(error)
    }
  }
  const checkIfWalletIsApprovedBase = async () => {
    try {
      if (active) {
        const signer = library.getSigner()
        const contractBase = new ethers.Contract(assetBase.value, abiErc20, signer)
        const allowanceBase = await contractBase.allowance(account, currentNetwork.contracts.earn)
        if (allowanceBase > 0) {
          setApprovedBase(true)
        } else {
          setApprovedBase(false)
        }
      }
    } catch (error) {
      log.red(error)
    }
  }
  const approveBaseToken = async () => {
    try {
      if (active) {
        const signer = library.getSigner()
        const tokenContract = new ethers.Contract(assetBase.value, abiErc20, signer)
        const approve = await tokenContract.approve(currentNetwork.contracts.earn, BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'))
        setTransactionPending(true)
        await approve.wait()
        checkIfWalletIsApprovedAlta()
        setTransactionPending(false)
        setApprovedBase(true)
        getQuote()
      } else {
        log.red('Connect Wallet!')
      }
    } catch (error) {
      log.red(error)
    }
  }
  const approveAlta = async () => {
    try {
      if (active) { 
        const signer = library.getSigner()
        const contractAlta = new ethers.Contract(currentNetwork.contracts.alta, abiErc20, signer)
        const approve = await contractAlta.approve(currentNetwork.contracts.earn, BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'))
        setTransactionPending(true)
        await approve.wait()
        setTransactionPending(false)
        checkIfWalletIsApprovedBase()
        setApprovedAlta(true)
        getQuote()
      } else {
        log.red('Connect Wallet!')
      }
    } catch (error) {
      log.red(error)
    }
  }
  const getEarnTerms = async () => {
    try {
      const web3 = createAlchemyWeb3(currentNetwork.endpoint)
      const contractEarn = new web3.eth.Contract(JSON.parse(abiEvmEarn), currentNetwork.contracts.earn)
      const allEarnTerms = await contractEarn.methods.getAllEarnTerms().call()
      const earnTerms = []
      let i = 0
      while (!allEarnTerms[i].open) {
        i++
      }
      setEarnTermList(allEarnTerms)
      setEarnTermId(i)
    } catch (error) {
      log.red('getAllEarnTerms error: ', error)
    }
  }
  const getEarnTiers = async () => {
    try {
      const web3 = createAlchemyWeb3(currentNetwork.endpoint)
      const contractEarn = new web3.eth.Contract(JSON.parse(abiEvmEarn), currentNetwork.contracts.earn)
      const tier1 = await contractEarn.methods.tier1Amount().call()
      const tier2 = await contractEarn.methods.tier2Amount().call()
      setEarnTiers([0, tier1, tier2])
    } catch (error) {
      log.red('getTiers error: ', error)
    }

  }
  const openEarnContract = async () => {
    log.magenta('openEarnContract')
    if (isNil(amount) || amount <= 0) {
      setAmountError(true)
    } else {
      setAmountError(false)
      try {
        if(active) {
          
          log.yellow("active:")
          const signer = library.getSigner()
          log.yellow("signer:")
          const contractEarn = new ethers.Contract(currentNetwork.contracts.earn, abiEvmEarn, signer)
          const length = await contractEarn.getAllEarnContracts()
          log.yellow("contractEarn:")
          const baseToken = new ethers.Contract(assetBase.value, abiErc20, signer)
          log.yellow("baseToken:")
          const altaToken = new ethers.Contract(currentNetwork.contracts.alta, abiErc20, signer)
          log.yellow("altaToken:")
          
          const baseTokenBalance = await baseToken.balanceOf(account)
          // IF ALTA NOT APPROVED HIDE THIS CODE
          const altaTokenBalance = await altaToken.balanceOf(account)

          log.magenta("baseTokenBalance:", baseTokenBalance)
          log.magenta("altaTokenBalance:", altaTokenBalance)
          

          if(baseTokenBalance.gte(amountWei)) {
            // CHECK FOR ALTA TOKEN BALANCE HERE
            log.magenta(earnTermId, amountWei, assetBase.value, amountAltaStake)
            const earnCreate = await contractEarn.openContract(
              earnTermId,
              amountWei,
              assetBase.value,
              amountAltaStake,
              { gasLimit: 1000000 }
            )
            log.cyan(earnCreate)
            setTransactionPending(true)
            await earnCreate.wait()
            const earnTerm = earnTermList[earnTermId]
            const netName = networkName(chainId)
            const revenue = assetBase.value === currentNetwork.contracts.alta ? amount * get(data, 'sweetwaterHomeStats.response.priceAFN', 0.01) : amount
            const name = `Earn Term ${earnTermId} (${upperFirst(netName)}): ${numeral(earnTerm[1] / (10 ** 4)).format('0.00%')} x ${numeral(earnInterestMultiplier).format('0.00')} = ${numeral((earnTerm[1] * earnInterestMultiplier) / (10 ** 4)).format('0.00%')}`
            log.bright.green("revenue:", revenue)
            log.bright.green("name:", name)
            log.bright.green("currency:", assetBase.title)
            if(process.env.NODE_ENV === 'production') {
              ReactGA.plugin.require('ecommerce')
              ReactGA.plugin.execute('ecommerce', 'addItem', {
                id: earnTermId,
                name: name,
                sku: earnTermId,
                price: numeral(earnTerm[1] / (10 ** 4)).format('0.00'),
                quantity: 1,
                currency: assetBase.title
              })
              ReactGA.plugin.execute('ecommerce', 'addTransaction', {
                id: `0x` + length.length + ' (' + upperFirst(netName) + ')',
                revenue: revenue,
                total: revenue,
                shipping: 0,
                tax: 0,
                currency: assetBase.title
              })
              ReactGA.plugin.execute('ecommerce', 'send')
              ReactGA.plugin.execute('ecommerce', 'clear')
            }
            var eventMetadata = {
              contractId: length.length,
              network: netName,
              asset: assetBase.title,
              amount: amount,
              revenue: revenue,
              earnTerm: name,
              url: `https://app.alta.finance/earn/0x` + length.length + '?network=' + netName
            }
            window.Intercom('trackEvent', 'open-contract', eventMetadata)
            setTransactionPending(false)
            Router.push('/earn/0x' + length.length + '?network=' + netName)
            closeModal()
          } else {
            console.log("Not enough " + assetBase.title)
          }
        } else {
          console.log('Connect Wallet!')
        }
      } catch(e) {
        log.red(e)
      }
    }
  }
  useEffect(() => {
    setAmountWei(BN(amount * (10 ** 18)).toString())
  }, [amount])
  useEffect(() => {
    if(amount > 0) {
      calculateInterest()
    }
  }, [amountAltaStake])
  useEffect(() => {
    getAssetList()
    checkIfWalletIsApprovedAlta()
  }, [])
  useEffect(() => {
    if (isNil(earnTermList)) {
      getEarnTerms()
    }
  }, [earnTermList])
  useEffect(() => {
    if (isNil(earnTiers)) {
      getEarnTiers()
    }
  }, [earnTiers])
  useEffect(() => {
    if (!isNil(earnTermId)) {
      calculateInterest()
      calculateCloseDate()
    }
  }, [earnTermId])
  useEffect(() => {
    checkIfWalletIsApprovedBase()
  }, [assetBase])
  return (
    <div>
      <div className='w-100 py-3'>
        <div className='row'>
          <div className='col-12 col-md-6'>
            <div className='form-group mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{get(page, 'earnAmount', '')}</div>
              </div>
              <div className={`input-outer input-outer-select input-outer-select-custom border-bottom-0 ${assetBaseError && 'is-invalid'}`}>
                <select 
                  className='form-control form-control-lg'
                  value={assetBase.value}
                  id='assetBase'
                  onChange={e => setAssetBase(filter(assetBaseList, { value: e.target.value})[0])}
                >
                  {assetBaseList.length > 0 && assetBaseList.map(option =>
                    <option value={option.value} key={option.value}>{option.title}</option>
                  )}
                </select>
              </div>
              <div
                className={`input-outer ${amountError && 'is-invalid'}`}
              >
                <input
                  className={`form-control form-control-lg ${amountError && 'is-invalid'}`}
                  id='inputAmount'
                  placeholder={`0 ${get(assetBase, 'title', '')}`}
                  type='text'
                  pattern='[0-9]*'
                  value={amount}
                  onBlur={e => getQuote()}
                  onChange={e => setAmount(e.target.validity.valid ? e.target.value : amount)}
                />
              </div>
            </div>
            {!approvedBase && active && !transactionPending && <div className='w-100 d-flex align-items-center justify-content-end mt-3'>
                <button className='btn btn-sm btn-pill btn-outline-primary btn-animate' onClick={approveBaseToken}>{get(page, 'stakeApprove', 'Approve')} {get(assetBase, 'title', '')}</button>
            </div>}

            <div className='form-group mt-3 mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{get(page, 'earnStakeAlta', 'ALTA Stake Bonus')}</div>
              </div>
              <div className={`input-outer input-outer-select`}>
                <select 
                  className='form-control form-control-lg'
                  placeholder='x 1.00 | 0 ALTA'
                  value={amountAltaStake}
                  id='assetBase'
                  onChange={e => setAmountAltaStake(e.target.value)}
                >
                  {isNil(earnTiers) && <option value={0}>x 1.00 | 0 ALTA</option>}
                  {!isNil(earnTiers) && earnTiers.map((option, i) => {
                    let x = 1.00
                    if(i === 1) { x = 1.15 }
                    if(i === 2) { x = 1.30 }
                    const altaDecimals = BigNumber.from("10").pow(("14").toString())
                    const option0 = BigNumber.from(option.toString())
                    let y = Number(option0.div(altaDecimals.toString())) / (10 ** 4)
                    return (
                      <option value={option} key={option}>x {numeral(x).format('0.00')} | {numeral(y).format('0,0')} ALTA</option>
                    )
                  })}
                </select>
              </div>
            </div>
            {!approvedAlta && active && !transactionPending && <div className='w-100 d-flex align-items-center justify-content-end mt-3'>
                <button className='btn btn-sm btn-pill btn-outline-primary btn-animate' onClick={approveAlta}>{get(page, 'stakeApprove', 'Approve')} ALTA</button>
            </div>}


            
            <div className='form-group mt-3 mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{get(page, 'earnTerm', '')}</div>
              </div>
              <div className='input-outer'>
                <table className='table table-sm text-size-sm rounded mb-0'>
                  <tbody>
                    {isNil(earnTermList) &&
                      <tr>
                        <td colSpan={4} className='text-right'><Loader /></td>
                      </tr>}
                    {!isNil(earnTermList) && earnTermList.map((rate, i) => {
                      if(rate.open) {
                        return (
                          <tr key={rate[0] + i} onClick={() => setEarnTermId(i)} className={`cursor-pointer ${i === earnTermId && 'active'}`}>
                            <td>
                              {moment.duration(rate[0], 'days').asMonths().toFixed(0)} Months
                            </td>
                            <td className='text-right text-size-xs'>
                              {numeral(rate[1] / (10 ** 4)).format('0.00%')}
                            </td>
                            <td className='text-right text-size-xs'>
                              x {numeral(earnInterestMultiplier).format('0.00')}
                            </td>
                            <td className='text-right'>
                              {numeral((rate[1] * earnInterestMultiplier) / (10 ** 4)).format('0.00%')}
                            </td>
                          </tr>
                        )
                      }
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className='col-12 col-md-6'>
            <div className='form-group mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{get(page, 'earnContractDetails', '')}</div>
              </div>
              <div className='input-outer'>
                <table className='table table-sm text-size-sm rounded mb-0'>
                  <tbody>
                    <tr>
                      <td><img src={`/tokens/${get(assetBase, 'value', '')}.png`} className='icon mr-2' /><strong>{get(assetBase, 'title', '')}</strong></td>
                      <td className='text-right'>{numeral(amount).format('0,0')}</td>
                    </tr>
                    <tr>
                      <td>
                        <img src='/tokens/alta.png' className='icon mr-2' /><strong>ALTA</strong>
                      </td>
                      <td className='text-right'>{numeral(amountAltaStake / (10 ** 18)).format('0,0')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className='form-group mt-3 mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{get(page, 'earnContractValue', '')}</div>
              </div>
              <div className='input-outer'>
                <table className='table table-sm text-size-sm rounded mb-0'>
                  <tbody>
                    <tr>
                      <td>
                        <img src={`/tokens/${get(assetBase, 'value', '')}.png`} className='icon mr-2' /><strong>{get(assetBase, 'title', '')}</strong>
                      </td>
                      <td className='text-right'>
                        {numeral(Number((get(earnTermList, `[${earnTermId}][1]`, 0)) * earnInterestMultiplier) / (10 ** 4)).format('0.00%')}
                      </td>
                      <td className='text-right'>
                        {numeral(earnInterestBase).format('0,0.0000')}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <img src='/tokens/alta.png' className='icon mr-2' /><strong>ALTA</strong>
                      </td>
                      <td className='text-right' colSpan='2'>{numeral(earnInterestBonus).format('0,0')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className='form-group mt-3 mb-0'>
              <div className='input-outer input-outer-title'>
                <div className='form-control'>{get(page, 'earnCloseDate', 'Close Date')}</div>
              </div>
              <div className='input-outer'>
                <table className='table table-sm text-size-sm rounded mb-0'>
                  <tbody>
                    <tr>
                      <td>{get(page, 'earnDate', 'Date')}</td>
                      <td className='text-right'>{moment(paybackDate).format('MMM DD, YYYY')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className='d-flex w-100 justify-content-end mt-5'>
          {transactionPending && <Loader />}
          {!active && !transactionPending && <button className='btn btn-pill btn-outline-primary btn-animate' onClick={openModalWallet}>{get(page, 'connectToWallet', 'Connect to Wallet')}</button>}
          {approvedBase && active && !transactionPending && <button className='btn btn-pill btn-outline-primary btn-animate' onClick={openEarnContract}>Open Earn Contract</button>}
        </div>
      </div>
    </div>
  )
}

const SWEETWATER_HOME_STATS = gql`
  query SWEETWATER_HOME_STATS {
    sweetwaterHomeStats {
      success
      statusCode
      reason
      response
    }
  }
`

export async function getServerSideProps (context) {
  const httpLink = await createHttpLink({
    uri: process.env.CR4_DL_GRAPHQL_URI
  })
  const authLink = await setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        'x-api-key': process.env.CR4_DL_API_KEY
      }
    }
  })
  const cr4dl = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
    ssrMode: typeof window === 'undefined'
  })
  const { data } = await cr4dl.query({
    query: SWEETWATER_HOME_STATS
  })
  return {
    props: {
      data
    }
  }
}

const mapStateToProps = state => ({
  currentAccount: state.global.currentAccount,
  currentNetwork: state.global.currentNetwork,
  network: state.global.network,
  assets: state.global.assets
})

const mapDispatchToProps = dispatch => ({
  openModal: (modal) => dispatch(openModal(modal)),
  closeModal: () => dispatch(closeModal())
})

export default connect(mapStateToProps, mapDispatchToProps)(EarnCreate)
