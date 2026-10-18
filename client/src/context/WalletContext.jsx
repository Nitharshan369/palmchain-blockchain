import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * WalletContext
 * Manages MetaMask wallet connection state across the entire app.
 * Provides wallet address, connection status, and connect/disconnect helpers.
 */
const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  // Fetch or upsert the Supabase profile for this wallet address
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
      console.warn('[WalletContext] Profile sync failed:', e.message);
    }
  }, []);

  // Restore previous wallet session on load
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          syncProfile(accounts[0]);
        }
      })
      .catch(console.warn);

    window.ethereum
      .request({ method: 'eth_chainId' })
      .then(setChainId)
      .catch(console.warn);

    const onAccountsChanged = (accounts) => {
      const newAddr = accounts[0] || null;
      setAddress(newAddr);
      syncProfile(newAddr);
    };
    const onChainChanged = (id) => setChainId(id);

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener('chainChanged', onChainChanged);
    };
  }, [syncProfile]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to continue.');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const id = await window.ethereum.request({ method: 'eth_chainId' });
      setAddress(accounts[0]);
      setChainId(id);
      await syncProfile(accounts[0]);
    } catch (e) {
      setError(e.message || 'Wallet connection rejected');
    } finally {
      setIsConnecting(false);
    }
  }, [syncProfile]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setProfile(null);
    setError(null);
  }, []);

  const isSepoliaNetwork = chainId === '0xaa36a7' || chainId === '11155111';

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isSepoliaNetwork,
        isConnecting,
        error,
        profile,
        setProfile,
        connect,
        disconnect,
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
