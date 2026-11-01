import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  Building2,
  DollarSign,
  Receipt,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Percent,
} from 'lucide-react';
import BarangayBusinessClearance, { BusinessPermitData } from './BarangayBusinessClearance';

interface BusinessPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BusinessPermitData>;
  onPrint?: (data: BusinessPermitData) => void;
  residents?: Array<{ fullName: string; contactNo?: string; address?: string }>;
  defaultSignatoryName?: string;
  defaultSignatoryTitle?: string;
  logoUrl?: string;
}

export const BusinessPermitModal: React.FC<BusinessPermitModalProps> = ({
  isOpen,
  onClose,
  initialData,
  onPrint,
  residents = [],
  defaultSignatoryName = 'HON. DAVID M. AGRAVANTE',
  defaultSignatoryTitle = 'Punong Barangay',
  logoUrl = '/logo.png',
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Form Fields State
  const [businessName, setBusinessName] = useState('');
  const [permitteeName, setPermitteeName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [natureOfBusiness, setNatureOfBusiness] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [capitalInvested, setCapitalInvested] = useState('');
  const [grossSales, setGrossSales] = useState('');
  const [purpose, setPurpose] = useState('');
  const [issuedDate, setIssuedDate] = useState(todayStr);

  // Signatory State
  const [signatoryName, setSignatoryName] = useState(defaultSignatoryName);
  const [signatoryTitle, setSignatoryTitle] = useState(defaultSignatoryTitle);

  // Payment Breakdown State
  const [hasFee, setHasFee] = useState(true);
  const [orNumber, setOrNumber] = useState('');
  const [feeAmount, setFeeAmount] = useState<number | string>(500);
  const [docStampsAmount, setDocStampsAmount] = useState<number | string>(30);
  const [paymentDate, setPaymentDate] = useState(todayStr);

  // Active Tab: 'edit' or 'preview'
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      if (initialData.business_name !== undefined) setBusinessName(initialData.business_name);
      if (initialData.permittee_name !== undefined) setPermitteeName(initialData.permittee_name);
      if (initialData.business_address !== undefined) setBusinessAddress(initialData.business_address);
      if (initialData.nature_of_business !== undefined) setNatureOfBusiness(initialData.nature_of_business);
      if (initialData.contact_number !== undefined) setContactNumber(initialData.contact_number);
      if (initialData.capital_invested !== undefined) setCapitalInvested(String(initialData.capital_invested));
      if (initialData.gross_sales !== undefined) setGrossSales(String(initialData.gross_sales));
      if (initialData.purpose !== undefined) setPurpose(initialData.purpose);
      if (initialData.issued_date !== undefined) setIssuedDate(initialData.issued_date);
      if (initialData.punong_barangay_name !== undefined) setSignatoryName(initialData.punong_barangay_name);
      if (initialData.punong_barangay_title !== undefined) setSignatoryTitle(initialData.punong_barangay_title);

      if (initialData.payment) {
        setHasFee(Boolean(initialData.payment.has_fee));
        if (initialData.payment.or_number !== undefined) setOrNumber(initialData.payment.or_number);
        if (initialData.payment.fee_amount !== undefined) setFeeAmount(initialData.payment.fee_amount);
        if (initialData.payment.doc_stamps_amount !== undefined) setDocStampsAmount(initialData.payment.doc_stamps_amount);
        if (initialData.payment.payment_date !== undefined) setPaymentDate(initialData.payment.payment_date);
      }
    } else {
      // Auto generate random sample O.R. if empty
      if (!orNumber) {
        const randOr = Math.floor(100000 + Math.random() * 900000);
        setOrNumber(`OR-${new Date().getFullYear()}-${randOr}`);
      }
    }
  }, [initialData, isOpen]);

  // Update default signatory if prop changes
  useEffect(() => {
    if (defaultSignatoryName) setSignatoryName(defaultSignatoryName);
    if (defaultSignatoryTitle) setSignatoryTitle(defaultSignatoryTitle);
  }, [defaultSignatoryName, defaultSignatoryTitle]);

  // Auto-calculated total amount
  const parsedFee = Number(feeAmount) || 0;
  const parsedDocStamps = Number(docStampsAmount) || 0;
  const totalAmount = hasFee ? parsedFee + parsedDocStamps : 0;

  // Build current BusinessPermitData object
  const currentPermitData: BusinessPermitData = useMemo(() => {
    return {
      business_name: businessName,
      permittee_name: permitteeName,
      business_address: businessAddress,
      nature_of_business: natureOfBusiness,
      contact_number: contactNumber,
      capital_invested: capitalInvested,
      gross_sales: grossSales,
      purpose: purpose,
      issued_date: issuedDate,
      punong_barangay_name: signatoryName,
      punong_barangay_title: signatoryTitle,
      payment: {
        has_fee: hasFee,
        or_number: hasFee ? orNumber : '',
        fee_amount: hasFee ? parsedFee : 0,
        doc_stamps_amount: hasFee ? parsedDocStamps : 0,
        total_amount: totalAmount,
        payment_date: paymentDate,
      },
    };
  }, [
    businessName,
    permitteeName,
    businessAddress,
    natureOfBusiness,
    contactNumber,
    capitalInvested,
    grossSales,
    purpose,
    issuedDate,
    signatoryName,
    signatoryTitle,
    hasFee,
    orNumber,
    parsedFee,
    parsedDocStamps,
    totalAmount,
    paymentDate,
  ]);

  const handlePrintAction = () => {
    if (onPrint) {
      onPrint(currentPermitData);
    } else {
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                Barangay Business Clearance Studio
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  BC-07
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official permit issuance generator with conditional Official Receipt (O.R.) financial engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Form Edit vs A4 Preview */}
            <div className="flex items-center bg-slate-200/70 p-1 rounded-full text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText size={14} />
                <span>Form Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye size={14} />
                <span>Live A4 Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrintAction}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>Print Clearance</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
              aria-label="Close Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {activeTab === 'edit' ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Business & Permittee Details (7 Cols) */}
              <div className="md:col-span-7 space-y-5 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600" />
                    Two-Column Business Information
                  </h3>
                  <span className="text-[11px] font-medium text-slate-400">Step 1 • Details</span>
                </div>

                <div className="space-y-4">
                  {/* BUSINESS NAME */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Enter business name..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 uppercase focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {/* PERMITTEE */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Permittee / Owner Name <span className="text-red-500">*</span>
                      </label>
                      {residents.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {residents.length} residents on file
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={permitteeName}
                        onChange={(e) => setPermitteeName(e.target.value)}
                        placeholder="Enter permittee / owner name..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* ADDRESS */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Business Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      placeholder="Enter business address..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                    />
                  </div>

                  {/* NATURE OF BUSINESS & CONTACT NUMBER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nature of Business
                      </label>
                      <input
                        type="text"
                        value={natureOfBusiness}
                        onChange={(e) => setNatureOfBusiness(e.target.value)}
                        placeholder="e.g. Retail / Services"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        placeholder="0917-000-0000"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* CAPITAL INVESTED & GROSS SALES */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Capital Invested (₱)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₱</span>
                        <input
                          type="text"
                          value={capitalInvested}
                          onChange={(e) => setCapitalInvested(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Gross Sales (₱)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">₱</span>
                        <input
                          type="text"
                          value={grossSales}
                          onChange={(e) => setGrossSales(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PURPOSE & ISSUANCE DATE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Issuance Purpose
                        </label>
                        <span className="text-[10px] text-slate-400">Wait for user input/selection</span>
                      </div>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        placeholder="e.g. the renewal of Mayor's Business Permit."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {[
                          "the renewal of Mayor's Business Permit.",
                          "new Mayor's Business Permit.",
                          "business license application.",
                          "bank account opening.",
                        ].map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPurpose(p)}
                            className={`text-[10px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                              purpose === p
                                ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Issuance Date
                      </label>
                      <input
                        type="date"
                        value={issuedDate}
                        onChange={(e) => setIssuedDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Conditional Fee / O.R. & Signatory Engine (5 Cols) */}
              <div className="md:col-span-5 space-y-5">
                {/* 1. Official Receipt / Payment Block Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Receipt size={16} className="text-emerald-600" />
                      O.R. Payment Breakdown
                    </h3>

                    {/* Has Fee Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setHasFee(!hasFee)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        hasFee ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          hasFee ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {hasFee ? (
                    <div className="space-y-3.5 pt-1">
                      <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span>Fee applicable: O.R. financial box will display on bottom-left.</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Official Receipt No. (O.R. No.)
                        </label>
                        <input
                          type="text"
                          value={orNumber}
                          onChange={(e) => setOrNumber(e.target.value)}
                          placeholder="e.g. OR-2026-8842"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Fee (₱)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={feeAmount}
                            onChange={(e) => setFeeAmount(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Doc. Stamps (₱)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={docStampsAmount}
                            onChange={(e) => setDocStampsAmount(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                          />
                        </div>
                      </div>

                      {/* Total Amount Auto Calculated Display */}
                      <div className="p-3 bg-slate-900 rounded-xl text-white flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Total Amount:
                        </span>
                        <span className="text-base font-black font-mono text-emerald-400">
                          ₱{totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-100 rounded-xl border border-slate-200/80 text-center space-y-2">
                      <AlertCircle size={24} className="text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">Fee Waived / Free Document</p>
                      <p className="text-[11px] text-slate-500">
                        The Official Receipt (O.R.) financial box is hidden. The certificate will render as a clean standard clearance.
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Official Signatory Config Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <UserCheck size={16} className="text-blue-600" />
                      Signatory Authority
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Signatory Full Name
                      </label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Signatory Title
                      </label>
                      <input
                        type="text"
                        value={signatoryTitle}
                        onChange={(e) => setSignatoryTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Live A4 Print Preview Tab */
            <div className="flex flex-col items-center justify-center p-4">
              <div className="mb-3 text-center">
                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                  210mm × 297mm (A4 Print Preview Canvas)
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Verified layout matching the official Barangay Zapatera Business Clearance document
                </p>
              </div>

              <div className="overflow-x-auto w-full flex justify-center py-4 bg-slate-200/50 rounded-2xl border border-slate-300/60 shadow-inner">
                <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center' }}>
                  <BarangayBusinessClearance data={currentPermitData} logoUrl={logoUrl} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {hasFee ? (
              <span className="font-semibold text-emerald-600">
                ● Fee enabled: ₱{totalAmount.toFixed(2)} total with O.R. block
              </span>
            ) : (
              <span className="font-semibold text-slate-500">
                ○ Fee exempted / waived: Clean standard layout
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrintAction}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-full shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Printer size={15} />
              <span>Print Business Clearance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessPermitModal;

