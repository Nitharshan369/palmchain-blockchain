import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { supabase } from '../lib/supabase';
import {
  SEPOLIA_CHAIN_ID_DECIMAL,
  SEPOLIA_CHAIN_ID_HEX,
  SEPOLIA_NETWORK_CONFIG,
  PRODUCER_STATUS,
  isProducerRegistryConfigured,
  getProducerRegistryReadOnly,
} from '../contracts';

/**
 * WalletContext
 * Manages MetaMask wallet connection, Ethereum Sepolia network enforcement,
 * read-only vs signer providers, and on-chain ProducerRegistry status.
 */
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [balance, setBalance] = useState('0.000');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  // On-chain Producer Info from ProducerRegistry.sol
  const [onChainProducer, setOnChainProducer] = useState({
    isConfigured: false,
    status: 0,
    statusText: 'NotRegistered',
    name: '',
    registeredAt: 0,
    verifiedAt: 0,
    isVerified: false,
    isRegistered: false,
    isSuspended: false,
  });
  const [isLoadingProducerStatus, setIsLoadingProducerStatus] = useState(false);

  // Check if MetaMask is present
  const isMetaMaskInstalled = typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask || window.ethereum);

  // Determine if current network is Ethereum Sepolia
  const isSepolia = useMemo(() => {
    if (!chainId) return false;
    const numId = typeof chainId === 'string' && chainId.startsWith('0x')
      ? parseInt(chainId, 16)
      : Number(chainId);
    return numId === SEPOLIA_CHAIN_ID_DECIMAL;
  }, [chainId]);

  // Shortened address formatting helper
  const shortAddress = useMemo(() => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  // Ethers browser provider & signer instances
  const provider = useMemo(() => {
    if (!isMetaMaskInstalled || !address) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, [isMetaMaskInstalled, address]);

  // Fetch ETH balance
  const refreshBalance = useCallback(async (targetAddress) => {
    const addr = targetAddress || address;
    if (!addr || !window.ethereum) {
      setBalance('0.000');
      return;
    }
    try {
      const p = new ethers.BrowserProvider(window.ethereum);
      const rawBalance = await p.getBalance(addr);
      const formatted = ethers.formatEther(rawBalance);
      setBalance(parseFloat(formatted).toFixed(4));
    } catch (e) {
      console.warn('[WalletContext] Failed to fetch balance:', e.message);
    }
  }, [address]);

  // Read producer status from deployed ProducerRegistry contract
  const refreshProducerStatus = useCallback(async (targetAddress) => {
    const addr = targetAddress || address;
    if (!addr) {
      setOnChainProducer({
        isConfigured: isProducerRegistryConfigured(),
        status: 0,
        statusText: 'NotRegistered',
        name: '',
        registeredAt: 0,
        verifiedAt: 0,
        isVerified: false,
        isRegistered: false,
        isSuspended: false,
      });
      return;
    }

    if (!isProducerRegistryConfigured()) {
      // Contract address not configured in .env
      setOnChainProducer({
        isConfigured: false,
        status: 0,
        statusText: 'NotConfigured',
        name: '',
        registeredAt: 0,
        verifiedAt: 0,
        isVerified: false,
        isRegistered: false,
        isSuspended: false,
      });
      return;
    }

    setIsLoadingProducerStatus(true);
    try {
      // Use read-only provider so no gas/wallet popup is required
      const contract = getProducerRegistryReadOnly();
      const rawInfo = await contract.getProducer(addr);

      // rawInfo: [wallet, name, status (uint8), registeredAt, verifiedAt]
      const statusCode = Number(rawInfo.status);
      const statusText = PRODUCER_STATUS[statusCode] || 'Unknown';

      setOnChainProducer({
        isConfigured: true,
        status: statusCode,
        statusText,
        name: rawInfo.name || '',
        registeredAt: Number(rawInfo.registeredAt),
        verifiedAt: Number(rawInfo.verifiedAt),
        isVerified: statusCode === 2,
        isRegistered: statusCode === 1 || statusCode === 2,
        isSuspended: statusCode === 3,
      });
    } catch (e) {
      console.warn('[WalletContext] Failed to read on-chain producer status:', e.message);
      setOnChainProducer((prev) => ({
        ...prev,
        isConfigured: true,
        status: 0,
        statusText: 'NotRegistered',
        isVerified: false,
        isRegistered: false,
      }));
    } finally {
      setIsLoadingProducerStatus(false);
    }
  }, [address]);

  // Sync Supabase off-chain profile
  const syncProfile = useCallback(async (walletAddress) => {
    if (!walletAddress) {
      setProfile(null);
      return;
    }
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .ilike('wallet_address', walletAddress)
        .maybeSingle();

      if (err) throw err;
      setProfile(data || null);
    } catch (e) {
      console.warn('[WalletContext] Supabase profile sync warning:', e.message);
    }
  }, []);

  // Silent account check on mount (ONLY checks if user ALREADY connected, does NOT prompt)
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (accounts && accounts.length > 0) {
          const currentAddr = accounts[0];
          setAddress(currentAddr);
          syncProfile(currentAddr);
          refreshBalance(currentAddr);
          refreshProducerStatus(currentAddr);
        }
      })
      .catch((e) => console.warn('[WalletContext] eth_accounts check error:', e.message));

    window.ethereum
      .request({ method: 'eth_chainId' })
      .then((id) => setChainId(id))
      .catch((e) => console.warn('[WalletContext] eth_chainId check error:', e.message));

    // Handle account changes
    const onAccountsChanged = (accounts) => {
      if (accounts && accounts.length > 0) {
        const newAddr = accounts[0];
        setAddress(newAddr);
        setError(null);
        syncProfile(newAddr);
        refreshBalance(newAddr);
        refreshProducerStatus(newAddr);
      } else {
        // User disconnected their account in MetaMask
        setAddress(null);
        setBalance('0.000');
        setProfile(null);
        setOnChainProducer({
          isConfigured: isProducerRegistryConfigured(),
          status: 0,
          statusText: 'NotRegistered',
          name: '',
          registeredAt: 0,
          verifiedAt: 0,
          isVerified: false,
          isRegistered: false,
          isSuspended: false,
        });
      }
    };

    // Handle network / chain changes
    const onChainChanged = (newChainId) => {
      setChainId(newChainId);
      if (address) {
        refreshBalance(address);
        refreshProducerStatus(address);
      }
    };

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener('accountsChanged', onAccountsChanged);
        window.ethereum.removeListener('chainChanged', onChainChanged);
      }
    };
  }, [syncProfile, refreshBalance, refreshProducerStatus, address]);

  // Connect wallet on explicit user trigger
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentChain = await window.ethereum.request({ method: 'eth_chainId' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected in MetaMask.');
      }

      const connectedAddr = accounts[0];
      setAddress(connectedAddr);
      setChainId(currentChain);

      await syncProfile(connectedAddr);
      await refreshBalance(connectedAddr);
      await refreshProducerStatus(connectedAddr);
      return true;
    } catch (err) {
      console.error('[WalletContext] Connection error:', err);
      if (err.code === 4001) {
        setError('Connection request was rejected in MetaMask.');
      } else if (err.code === -32002) {
        setError('Connection request is already pending in MetaMask. Please check your extension.');
      } else {
        setError(err.message || 'Failed to connect MetaMask wallet.');
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [syncProfile, refreshBalance, refreshProducerStatus]);

  // Disconnect / reset local session state
  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setBalance('0.000');
    setProfile(null);
    setError(null);
    setOnChainProducer({
      isConfigured: isProducerRegistryConfigured(),
      status: 0,
      statusText: 'NotRegistered',
      name: '',
      registeredAt: 0,
      verifiedAt: 0,
      isVerified: false,
      isRegistered: false,
      isSuspended: false,
    });
  }, []);

  // Switch network to Ethereum Sepolia
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed.');
      return false;
    }

    setError(null);
    try {
      // Try switching to Sepolia
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      return true;
    } catch (switchError) {
      // Code 4902 means the chain has not been added to MetaMask
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_NETWORK_CONFIG],
          });
          return true;
        } catch (addError) {
          if (addError.code === 4001) {
            setError('Request to add Ethereum Sepolia was rejected.');
          } else {
            setError(addError.message || 'Failed to add Sepolia network to MetaMask.');
          }
          return false;
        }
      } else if (switchError.code === 4001) {
        setError('Network switch request was rejected in MetaMask.');
        return false;
      } else {
        setError(switchError.message || 'Failed to switch to Ethereum Sepolia.');
        return false;
      }
    }
  }, []);

  // Helper to obtain an ethers Signer for transactions
  const getSigner = useCallback(async () => {
    if (!window.ethereum || !address) {
      throw new Error('Please connect your MetaMask wallet first.');
    }
    const p = new ethers.BrowserProvider(window.ethereum);
    return await p.getSigner();
  }, [address]);

  return (
    <WalletContext.Provider
      value={{
        address,
        shortAddress,
        chainId,
        isSepolia,
        isConnected: Boolean(address),
        isConnecting,
        isMetaMaskInstalled,
        balance,
        error,
        setError,
        profile,
        setProfile,
        onChainProducer,
        isLoadingProducerStatus,
        provider,
        connect,
        disconnect,
        switchNetwork,
        getSigner,
        refreshBalance,
        refreshProducerStatus,
        syncProfile,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
}
