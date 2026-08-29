import React, { useEffect, useRef, useState } from 'react';
import {
  LockKeyhole,
  MapPin,
  MessageCircle,
  PackageCheck,
  ScanSearch,
  ShieldCheck,
  UserCheck,
  UserRoundX,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const MODALS = {
  privacy: {
    title: 'Privacy Preserved',
    subtitle: 'Your personal information stays protected throughout the return process.',
    points: [
      { icon: UserRoundX, title: 'No Public Contact Details', text: 'Student phone numbers and personal contact information are not publicly displayed.' },
      { icon: LockKeyhole, title: 'Private Verification', text: 'Ownership answers and identifying details are kept private and used only for verification.' },
      { icon: MessageCircle, title: 'Verification-Gated Chat', text: 'Private chat becomes available only after the required verification/approval process.' },
      { icon: MapPin, title: 'Private Meeting Details', text: 'Meeting points or one-time shared locations remain inside the authorized conversation.' }
    ]
  },
  returns: {
    title: 'Verifiable Returns',
    subtitle: 'Every return follows a secure verification process.',
    flow: ['Match', 'Verify', 'Connect', 'Return'],
    points: [
      { icon: ScanSearch, title: 'Ownership Verification', text: 'Claimants must provide details that help prove the item belongs to them.' },
      { icon: UserCheck, title: 'Finder / Owner Approval', text: 'A button click alone does not automatically prove ownership or possession.' },
      { icon: MessageCircle, title: 'Secure Connection', text: 'Private communication is enabled only after the required approval.' },
      { icon: PackageCheck, title: 'Return Confirmation', text: 'The item can then be marked Delivered or Recovered after the handover.' }
    ]
  }
};

function InfoModal({ modal, onClose }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 py-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="footer-info-title"
        aria-describedby="footer-info-subtitle"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-blue-200 bg-white p-5 sm:p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="footer-info-title" className="text-xl font-extrabold text-gray-900">{modal.title}</h2>
            <p id="footer-info-subtitle" className="mt-1 text-sm leading-relaxed text-gray-500">{modal.subtitle}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={`Close ${modal.title}`} className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        {modal.flow && (
          <div className="my-5 flex flex-col items-center justify-center gap-1" aria-label="Return process: Match, Verify, Connect, Return">
            {modal.flow.map((step, index) => (
              <React.Fragment key={step}>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{step}</span>
                {index < modal.flow.length - 1 && <span aria-hidden="true" className="text-xs leading-none text-blue-300">&#8595;</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className={`${modal.flow ? '' : 'mt-5'} space-y-4`}>
          {modal.points.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Icon className="h-4 w-4" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={onClose} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          Got it
        </button>
      </div>
    </div>
  );
}

export default function Footer() {
  const [activeModal, setActiveModal] = useState(null);
  const triggerRef = useRef(null);

  const openModal = (modal, event) => {
    triggerRef.current = event.currentTarget;
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <>
      <footer className="bg-white border-t border-gray-200 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link to="/" className="flex items-center" aria-label="Go to LostLink home">
              <BrandLogo variant="footer" />
            </Link>

            <div className="flex items-center gap-6 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                <ShieldCheck className="w-3.5 h-3.5" /> Anurag University Exclusive
              </span>
              <button type="button" onClick={(event) => openModal(MODALS.privacy, event)} className="cursor-pointer transition-colors hover:text-blue-700 focus:outline-none focus:text-blue-700 focus:ring-2 focus:ring-blue-500 rounded-sm">Privacy Preserved</button>
              <button type="button" onClick={(event) => openModal(MODALS.returns, event)} className="cursor-pointer transition-colors hover:text-blue-700 focus:outline-none focus:text-blue-700 focus:ring-2 focus:ring-blue-500 rounded-sm">Verifiable Returns</button>
            </div>

            <div className="text-xs text-gray-400 text-center md:text-right">
              <p>{'\u00A9'} {new Date().getFullYear()} LostLink {'\u2014'} Anurag University Hackathon Project.</p>
            </div>
          </div>
        </div>
      </footer>
      {activeModal && <InfoModal modal={activeModal} onClose={closeModal} />}
    </>
  );
}
