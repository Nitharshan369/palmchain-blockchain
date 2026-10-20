import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, ShieldAlert } from 'lucide-react';
import { ethers } from 'ethers';
import { batchesApi, operationsApi } from '../../lib/api';
import { getBatchRegistryWithSigner, SEPOLIA_CHAIN_ID_DECIMAL } from '../../contracts';
import { useWallet } from '../../context/WalletContext';

export default function BatchInspection() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { isConnected, connect, getSigner } = useWallet();

  const [batch, setBatch] = useState(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [decisionState, setDecisionState] = useState('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    batchesApi.getByBatchNumber(batchId)
      .then((response) => setBatch(response.batch))
      .catch((loadError) => setError(loadError.message));
  }, [batchId]);

  const decide = async (decision) => {
    setDecisionState('pending');
    setError('');
    setMessage('');
    try {
      if (!isConnected) {
        await connect();
        throw new Error('Wallet connected. Select the decision again to submit it.');
      }
      const signer = await getSigner();
      if ((await signer.provider.getNetwork()).chainId !== BigInt(SEPOLIA_CHAIN_ID_DECIMAL)) {
        throw new Error('Switch MetaMask to Sepolia.');
      }
      if (decision === 'reject' && !reason.trim()) {
        throw new Error('A rejection reason is required for rejection.');
      }

      const contract = getBatchRegistryWithSigner(signer);

      // Check if batch exists on Sepolia
      let chainBatch = null;
      try {
        chainBatch = await contract.getBatch(batch.batch_number);
      } catch (checkErr) {
        // Batch not yet on Sepolia
      }

      if (!chainBatch) {
        setMessage(`Anchoring batch ${batch.batch_number} to Sepolia blockchain...`);
        const neeraScaled = Math.round(Number(batch.neera_liters || 850) * 100);
        const jaggeryScaled = Math.round(Number(batch.total_quantity_kg || 120) * 100);
        const dataHash = (batch.sha256_hash && batch.sha256_hash.startsWith('0x') && batch.sha256_hash.length === 66)
          ? batch.sha256_hash
          : ethers.keccak256(ethers.toUtf8Bytes(batch.batch_number));
        const createTx = await contract.createBatch(batch.batch_number, neeraScaled, jaggeryScaled, dataHash);
        setMessage(`Batch creation pending on Sepolia: ${createTx.hash}`);
        await createTx.wait(1);
        chainBatch = await contract.getBatch(batch.batch_number);
      }

      // If status is Created (0), advance to Processing (1)
      if (Number(chainBatch.status) === 0) {
        setMessage(`Advancing batch ${batch.batch_number} to Processing status on Sepolia...`);
        const procTx = await contract.startProcessing(batch.batch_number);
        setMessage(`Processing transition pending: ${procTx.hash}`);
        await procTx.wait(1);
      }

      setMessage(decision === 'approve' ? 'Verifying batch quality on Sepolia...' : 'Submitting batch rejection on Sepolia...');
      const transaction = decision === 'approve'
        ? await contract.verifyBatch(batch.batch_number)
        : await contract.rejectBatch(batch.batch_number, reason.trim());

      setMessage(`Transaction pending: ${transaction.hash}`);
      const receipt = await transaction.wait(1);
      if (receipt.status !== 1) throw new Error('The transaction reverted on Sepolia.');

      try {
        await operationsApi.verifierDecision(
          batch.batch_number,
          {
            transaction_hash: transaction.hash,
            decision,
            reason,
            notes,
            evidence: {
              trace_count: (batch.batch_trace_logs || []).length,
              document_refs: batch.canonical_metadata?.documentRefs || [],
            },
          },
          await getSigner()
        );
      } catch (apiErr) {
        console.warn('Backend decision sync notice:', apiErr.message);
      }

      setDecisionState('confirmed');
      setMessage(`Review confirmed on Sepolia: ${transaction.hash}`);
      setTimeout(() => navigate('/verifier/dashboard'), 2000);
    } catch (actionError) {
      setDecisionState('failed');
      setError(actionError.message || 'Review action failed.');
    }
  };

  if (!batch) {
    return <div className="py-12 text-center text-sm text-stone-500">{error || 'Loading production evidence…'}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-6">
      <Link to="/verifier/dashboard" className="inline-flex items-center gap-2 text-sm text-stone-600">
        <ArrowLeft size={15}/>Back to queue
      </Link>

      <header className="border-b border-cream-200 pb-5">
        <span className="text-xs font-bold uppercase text-blue-800">Confirmed production record</span>
        <h1 className="mt-1 text-3xl font-extrabold">{batch.batch_number}</h1>
        <p className="text-sm text-stone-600">
          {batch.producer?.full_name || 'Murugan Natural Palmyrah Cooperative'} · {batch.farm?.farm_name || 'Tenkasi Heritage Palmyrah Grove'}
        </p>
      </header>

      {message && <div role="status" className="rounded-xl bg-forest-50 p-3 text-sm text-forest-900 font-medium">{message}</div>}
      {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 font-medium">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ['Harvest', batch.harvest_date || '2026-03-10'],
          ['Neera', `${batch.neera_liters || 850} L`],
          ['Jaggery', `${batch.total_quantity_kg || 120} kg`],
          ['Brix', batch.sap_brix_value || '14.2° Bx'],
        ].map(([label, value]) => (
          <div className="rounded-2xl border border-cream-200 bg-white p-4" key={label}>
            <div className="text-xs text-stone-500">{label}</div>
            <div className="mt-1 font-bold">{value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-cream-200 bg-white p-6 shadow-warm">
        <h2 className="font-bold">Supporting evidence</h2>
        <div className="mt-4 space-y-2 text-sm">
          {(batch.batch_trace_logs || []).length ? (
            batch.batch_trace_logs.map((log) => (
              <div className="rounded-xl bg-cream-50 p-3" key={log.id || log.stage_name}>
                <strong>{log.stage_name}</strong> · {log.location_name || 'Tenkasi Grove'} · {log.notes || 'No notes'}
              </div>
            ))
          ) : (
            <p className="text-stone-500">No supporting trace records are available.</p>
          )}
          {(batch.canonical_metadata?.documentRefs || []).map((reference) => (
            <a className="block text-forest-800 underline" href={reference} target="_blank" rel="noreferrer" key={reference}>
              <ExternalLink className="mr-1 inline" size={13}/>Evidence document
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-cream-200 bg-white p-6 shadow-warm">
        <h2 className="font-bold">Verifier decision</h2>
        <p className="mt-1 text-xs text-stone-600">
          Submitting approval updates the Ethereum Sepolia smart contract directly with your verifier signature.
        </p>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Approval notes (e.g., Cane sugar adulteration 0.0%, Passed NABL assay)"
          className="mt-4 w-full rounded-xl border border-cream-300 p-3 text-sm"
          rows="3"
        />
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Rejection reason (required only for rejection)"
          className="mt-3 w-full rounded-xl border border-cream-300 p-3 text-sm"
          rows="2"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            disabled={decisionState === 'pending'}
            onClick={() => decide('approve')}
            className="inline-flex items-center gap-2 rounded-xl bg-forest-800 px-4 py-2 text-xs font-bold text-white hover:bg-forest-900 disabled:opacity-50"
          >
            <CheckCircle2 size={15}/>Approve on-chain
          </button>
          <button
            disabled={decisionState === 'pending'}
            onClick={() => decide('reject')}
            className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-xs font-bold text-red-800 hover:bg-red-50 disabled:opacity-50"
          >
            <ShieldAlert size={15}/>Reject on-chain
          </button>
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Approval is recorded on the Sepolia BatchRegistry contract ({batch.batch_number}).
        </p>
      </section>
    </div>
  );
}
