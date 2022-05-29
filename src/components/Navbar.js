import React, { useState, useEffect } from "react";
import Navbar from "react-bootstrap/Navbar";
import Nav from "react-bootstrap/Nav";
import Container from "react-bootstrap/Container";
import logo from "../Assets/personal-website-logo.png";
import Button from "react-bootstrap/Button";
import { ethers } from 'ethers'
// // import Link from 'next/link'
import get from 'lodash/get'
// import includes from 'lodash/includes'
// import filter from 'lodash/filter'
import isNil from 'lodash/isNil'
// import Flags from 'country-flag-icons/react/1x1'
// import LocaleCode from 'locale-code'
// import { useRouter } from 'next/router'
// import { connect } from 'react-redux'
import { useWeb3React } from '@web3-react/core'
// import accounting from 'accounting-js'
import log from 'ololog'
// import UAuth from '@uauth/js'
import { Link } from "react-router-dom";
import { CgGitFork, CgFileDocument } from "react-icons/cg";
import { ImBlog } from "react-icons/im";
import {
  AiFillStar,
  AiOutlineHome,
  AiOutlineFundProjectionScreen,
  AiOutlineUser,
} from "react-icons/ai";

// import networkName from '../helpers/web3/networkName'
import { injected } from '../helpers/web3/connectors'
import SelectWallet from './modal/selectWallet'


function NavBar() {
  const {chainId, account, activate, active } = useWeb3React()
  const [expand, updateExpanded] = useState(false);
  const [navColour, updateNavbar] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [provider, setProvider] = useState(null);

  const setNetwork = async (account, chainId) => {
      if (chainId === 1 || chainId === 3 || chainId === 137) {
        try {
          const provider = ethers.getDefaultProvider(0x1, {
            alchemy: process.env.ALCHEMY_KEY
          })
          const ens = await provider.lookupAddress(account)
          if (!isNil(ens)) {
            window.Intercom('update', {
              user_id: ens
            })
          } else {
            window.Intercom('update', {
              user_id: account
            })
          }
        } catch (e) {
          log.red.error(e)
        }
      } else {
        window.Intercom('update', {
          user_id: account
        })
      }
  }
  const checkEns = async (account) => {
    log.yellow("enter checkEns")
    log.bright.yellow("currentAccount:", account)
    const provider = ethers.getDefaultProvider(0x1, {
      etherscan: process.env.ETHERSCAN_KEY,
      infura: {
        projectId: process.env.INFURA_PROJECT_ID,
        projectSecret: process.env.INFURA_PROJECT_SECRET,
      },
      alchemy: process.env.ALCHEMY_KEY
    })
    let ens
    try {
      ens = await provider.lookupAddress(account)
      log.yellow("ens:", ens)
      if (!isNil(ens)) {
        setCurrentAccount(ens)
      }
    } catch (e) {
      log.red.error(e)
    }
   
    
  }
  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window

      if (!ethereum) {
        log.red('Please install MetaMask')
        return;
      } else {
        log.green("Wallet exists! We're ready to go!")
      }
      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' })

        if (accounts.length !== 0) {
          const account = accounts[0]
          log.yellow("Found an authorized account: ", account)
          await checkEns(accounts[0])
          if (!isNil(currentAccount)){
            setCurrentAccount(accounts[0])
          }
          await setProvider(provider)
        } else {
          log.red("No authorized account found")
        }
    } catch (error) {
      log.red.error(error)
    }
    
  }
  const openModalWallet = () => {
    openModal({
      title: 'Select Wallet',
      size: 'md',
      component: <SelectWallet />
    })
  }

  function scrollHandler() {
    if (window.scrollY >= 20) {
      updateNavbar(true);
    } else {
      updateNavbar(false);
    }
  }

  const connectWalletButton = () => {
    return (
      <button onClick={connectWalletHandler} className='cta-button connect-wallet-button '>
        Connect Wallet
      </button>
    )
  }

  const connectWalletHandler = async () => {
    const { ethereum } = window

      if (!ethereum) {
        alert('Please install MetaMask')
        return;
      } else {
        log.green("Wallet exists! We're ready to go!")
      }
      try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' })

        if (accounts.length !== 0) {
          const account = accounts[0]
          log.yellow("Found an authorized account: ", account)
          await checkEns(accounts[0])
          if (!isNil(currentAccount)){
            setCurrentAccount(accounts[0])
          }
          setProvider(provider)
        } else {
          log.red("No authorized account found")
        }
    } catch (error) {
      log.red.error(error)
    }
   }

  window.addEventListener("scroll", scrollHandler);

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  return (
    <Navbar
      expanded={expand}
      fixed="top"
      expand="md"
      className={navColour ? "sticky" : "navbar"}
    >
      <Container>
        <Navbar.Brand href="/" className="d-flex">
          <img src={logo} className="img-fluid logo" alt="brand" />
        </Navbar.Brand>
        <Navbar.Toggle
          aria-controls="responsive-navbar-nav"
          onClick={() => {
            updateExpanded(expand ? false : "expanded");
          }}
        >
          <span/>
          <span/>
          <span/>
        </Navbar.Toggle>
        <Navbar.Collapse id="responsive-navbar-nav">
          <Nav className="ms-auto" defaultActiveKey="#home">
            <Nav.Item>
              <Nav.Link as={Link} to="/" onClick={() => updateExpanded(false)}>
                <AiOutlineHome style={{ marginBottom: "2px" }} /> Home
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/about"
                onClick={() => updateExpanded(false)}
              >
                <AiOutlineUser style={{ marginBottom: "2px" }} /> About
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/project"
                onClick={() => updateExpanded(false)}
              >
                <AiOutlineFundProjectionScreen
                  style={{ marginBottom: "2px" }}
                />{" "}
                Projects
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              <Nav.Link
                as={Link}
                to="/resume"
                onClick={() => updateExpanded(false)}
              >
                <CgFileDocument style={{ marginBottom: "2px" }} /> Resume
              </Nav.Link>
            </Nav.Item>

            <Nav.Item>
              {currentAccount && <li className='nav-item nav-account nav-item-active nav-link'>
                <a className='nav-link p-0 text-size-sm'>
                  <span className='text-capitalize font-weight-regular mr-3'>{provider}</span>
                  <br className='d-block d-md-none' />{currentAccount.length === 42 ? currentAccount.substring(0, 4) + '...' + currentAccount.slice(currentAccount.length - 4) : currentAccount} 
                </a>
                </li>}
                {!currentAccount && <li className='nav-item nav-link'>
                  <a className='nav-link p-0 cursor-pointer text-size-sm'>
                   {connectWalletButton()}
                  </a>
              </li>}
            </Nav.Item>
            
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavBar;
