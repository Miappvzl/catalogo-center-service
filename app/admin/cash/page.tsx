"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ArrowLeft,
    Wallet,
    Banknote,
    DollarSign,
    CreditCard,
    Plus,
    ArrowRight,
    Loader2,
    XCircle,
    Save,
    ArrowDownToLine,
    ArrowUpFromLine,
    CheckCircle,
    AlertCircle,
    FileText,
    Copy, 
    Clock, 
    X, 
    Download,
    ShieldCheck
} from "lucide-react";
import ExcelJS from 'exceljs';
import Link from "next/link";
import { getSupabase } from "@/lib/supabase-client";
import { NumberInput } from "@/components/NumberInput"; 
import { AnimatePresence, motion, Variants } from "framer-motion";
import Swal from "sweetalert2";

// ============================================================================
// TIPOS ESTRICTOS
// ============================================================================
interface LedgerTotals {
    usd_cash: number;
    zelle: number;
    bs_transfer: number;
    other: number;
    orders_count: number;
    sales_cash: number;
    base_in_cash: number;
    manual_out_cash: number;
}

export default function CashRegisterPage() {
    const supabase = getSupabase();
    
    // Estados de Contexto
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);

    // Estados Financieros (Data del RPC)
    const [totals, setTotals] = useState<LedgerTotals>({
        usd_cash: 0, zelle: 0, bs_transfer: 0, other: 0, 
        orders_count: 0, sales_cash: 0, base_in_cash: 0, manual_out_cash: 0
    });
    
    // Historial (Libro Z y Movimientos)
    const [lastClosureDate, setLastClosureDate] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [movementHistory, setMovementHistory] = useState<any[]>([]);

    // Estados de Interfaz (Drawers)
    const [isMovementDrawerOpen, setIsMovementDrawerOpen] = useState(false);
    const [isClosureDrawerOpen, setIsClosureDrawerOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Formularios
    const [movementData, setMovementData] = useState({
        type: "out",
        amount: "" as number | "", 
        currency: "usd",
        paymentMethod: "cash",
        description: "",
    });
    const [reportedTotals, setReportedTotals] = useState({
        cash: "", zelle: "", bs: "", other: "", 
    });
    const [closureNotes, setClosureNotes] = useState("");

    // 1. INICIALIZACIÓN
    useEffect(() => {
        const initStore = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: store } = await supabase.from("stores").select("id").eq("user_id", user.id).single();
                if (store) setStoreId(store.id);
            }
        };
        initStore();
    }, [supabase]);

    // 2. MOTOR FINANCIERO O(1) - CONEXIÓN CON RPC
    const fetchFinancialData = useCallback(async () => {
        if (!storeId) return;
        
        try {
            // A. Ejecutar RPC para la telemetría exacta en 15ms
            const { data: rpcData, error: rpcError } = await supabase.rpc('get_floating_cash_summary', { 
                p_store_id: storeId 
            });
            if (rpcError) throw rpcError;
            if (rpcData && !rpcData.error) {
                setTotals(rpcData as LedgerTotals);
            }

            // B. Traer Historial de Cierres (Libro Z)
            const { data: closures } = await supabase
                .from('cash_closures')
                .select('*')
                .eq('store_id', storeId)
                .order('closed_at', { ascending: false })
                .limit(10);
            
            if (closures && closures.length > 0) {
                setHistory(closures);
                setLastClosureDate(closures[0].closed_at);
            }

            // C. Traer Historial de Ajustes Manuales Recientes
            const { data: movements } = await supabase
                .from('cash_movements')
                .select('*')
                .eq('store_id', storeId)
                .is('closure_id', null)
                .order('created_at', { ascending: false });
            
            if (movements) setMovementHistory(movements);

        } catch (e: any) {
            console.error("Error al sincronizar ledger:", e.message);
        } finally {
            setLoading(false);
        }
    }, [supabase, storeId]);

    useEffect(() => {
        if (storeId) fetchFinancialData();
    }, [fetchFinancialData, storeId]);


    // ============================================================================
    // 3. ACCIONES OPERATIVAS Y LÓGICA DE NEGOCIO (Handlers)
    // ============================================================================
    const handleSubmitMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;
        const numAmount = Number(movementData.amount);
        if (numAmount <= 0) {
            Swal.fire({
                icon: "error",
                title: "Monto Inválido",
                text: "El monto a ajustar debe ser obligatoriamente mayor a 0.",
                confirmButtonColor: "#0a0a0a",
                customClass: { popup: "rounded-2xl font-sans text-xs" },
            });
            return;
        }
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from("cash_movements")
                .insert([
                    {
                        store_id: storeId,
                        type: movementData.type,
                        amount: numAmount,
                        currency: movementData.currency,
                        payment_method: movementData.paymentMethod,
                        description: movementData.description.trim(),
                    },
                ]);
            if (error) throw error;
            
            const Toast = Swal.mixin({
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 2000,
                customClass: {
                    popup: "bg-neutral-950 text-white rounded-xl text-xs font-bold border border-neutral-800",
                },
            });
            Toast.fire({ icon: "success", title: "Operación Registrada" });
            
            await fetchFinancialData(); // Refresca el motor O(1)
            
            setMovementData({
                type: "out",
                amount: "",
                currency: "usd",
                paymentMethod: "cash",
                description: "",
            });
            setIsMovementDrawerOpen(false);
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error de servidor",
                text: "No se pudo consolidar el movimiento manual en la base de datos.",
                confirmButtonColor: "#0a0a0a",
                customClass: { popup: "rounded-2xl font-sans text-xs" },
            });
        } finally {
            setIsSubmitting(false);
        }
    };

  const handleFinalClosure = async () => {
        if (!storeId || (totals.orders_count === 0 && movementHistory.length === 0)) return;
        setIsSubmitting(true);
        
        const expected = { cash: totals.usd_cash, zelle: totals.zelle, bs: totals.bs_transfer, other: totals.other };
        const reported = { cash: Number(reportedTotals.cash), zelle: Number(reportedTotals.zelle), bs: Number(reportedTotals.bs), other: Number(reportedTotals.other) };
        
        // 🚀 SANEAMIENTO FINANCIERO (Cero basura IEEE 754 en la Base de Datos)
        const diffs = { 
            cash: Number((reported.cash - expected.cash).toFixed(2)), 
            zelle: Number((reported.zelle - expected.zelle).toFixed(2)), 
            bs: Number((reported.bs - expected.bs).toFixed(2)), 
            other: Number((reported.other - expected.other).toFixed(2)) 
        };
        
        try {
            const { error } = await supabase.rpc("close_cash_register", {
                p_store_id: storeId,
                p_expected_totals: expected,
                p_reported_totals: reported,
                p_differences: diffs,
                p_notes: closureNotes,
            });
            if (error) throw error;
            
            await Swal.fire({
                title: "Arqueo Consolidado",
                text: "La caja ha sido sellada y la jornada administrativa fue finalizada.",
                icon: "success",
                confirmButtonColor: "#0a0a0a",
                customClass: { popup: "rounded-2xl font-sans text-xs" },
            });
            
            setIsClosureDrawerOpen(false);
            setReportedTotals({ cash: "", zelle: "", bs: "", other: "" });
            setClosureNotes("");
            
            await fetchFinancialData(); // Refresca el motor O(1)
        } catch (e) {
            Swal.fire({
                title: "Error de Consolidación",
                text: "No se pudo procesar el cierre contable.",
                icon: "error",
                confirmButtonColor: "#0a0a0a",
                customClass: { popup: "rounded-2xl font-sans text-xs" }
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyWhatsApp = (ticket: any) => {
        const date = new Date(ticket.closed_at).toLocaleString("es-VE");
        const t = ticket.reported_totals;
        const d = ticket.differences;
        let text = `*CIERRE DE CAJA - PREZISO*\nFecha: ${date}\n\n*ARQUEO FÍSICO (REPORTADO):*\n💵 Efectivo USD: *$${t.cash.toFixed(2)}*\n📱 Zelle: *$${t.zelle.toFixed(2)}*\n💳 Otros (POS/Digital): *$${t.other?.toFixed(2) || '0.00'}*\n🏦 Pago Móvil: *Bs ${t.bs.toLocaleString("es-VE")}*\n\n*DIFERENCIAS DETECTADAS:*\nEfectivo: ${d.cash === 0 ? "Exacto ✅" : d.cash > 0 ? `Sobra $${d.cash} ⚠️` : `Falta $${Math.abs(d.cash)} ❌`}\nZelle: ${d.zelle === 0 ? "Exacto ✅" : d.zelle > 0 ? `Sobra $${d.zelle} ⚠️` : `Falta $${Math.abs(d.zelle)} ❌`}\nOtros: ${d.other === 0 ? "Exacto ✅" : d.other > 0 ? `Sobra $${d.other} ⚠️` : `Falta $${Math.abs(d.other)} ❌`}\nPago Móvil: ${d.bs === 0 ? "Exacto ✅" : d.bs > 0 ? `Sobra Bs ${d.bs} ⚠️` : `Falta Bs ${Math.abs(d.bs)} ❌`}\n`;
        if (ticket.notes) text += `\n*NOTAS:*\n_${ticket.notes}_\n`;
        navigator.clipboard.writeText(text);
        
        const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2000,
            customClass: {
                popup: "bg-neutral-950 text-white rounded-xl text-xs font-bold border border-neutral-800",
            },
        });
        Toast.fire({ icon: "success", title: "Copiado al portapapeles" });
    };

    const handleDownloadExcel = async (ticket: any) => {
        if (!ticket) return;

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Preziso';
        const sheet = workbook.addWorksheet('Cierre de Caja');

        const date = new Date(ticket.closed_at).toLocaleString('es-VE');
        const expected = ticket.expected_totals;
        const reported = ticket.reported_totals;
        const diffs = ticket.differences;

        sheet.columns = [
            { key: 'concepto', width: 25 }, 
            { key: 'esperado', width: 22 }, 
            { key: 'reportado', width: 22 }, 
            { key: 'diferencia', width: 20 }
        ];

        sheet.mergeCells('A1:D1');
        const titleCell = sheet.getCell('A1');
        titleCell.value = 'REPORTE DE CIERRE DE CAJA - PREZISO';
        titleCell.font = { name: 'Arial', family: 4, size: 14, bold: true };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

        sheet.addRow(['ID de Cierre', ticket.id.toUpperCase(), '', '']);
        sheet.addRow(['Fecha y Hora', date, '', '']);
        sheet.addRow([]); 

        const headerRow = sheet.addRow(['CONCEPTO', 'SISTEMA (ESPERADO)', 'ARQUEO (REPORTADO)', 'DIFERENCIA']);
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };

        headerRow.eachCell((cell) => {
            cell.border = { bottom: { style: 'thin' } };
        });

        const addFinancialRow = (concepto: string, exp: number, rep: number, diff: number, symbol: string) => {
            const row = sheet.addRow([concepto, exp, rep, diff]);
            const format = `"${symbol}" #,##0.00;[Red]-"${symbol}" #,##0.00`;
            row.getCell(2).numFmt = format;
            row.getCell(3).numFmt = format;
            row.getCell(4).numFmt = format;
        };

        addFinancialRow('Efectivo (USD)', expected.cash, reported.cash, diffs.cash, '$');
        addFinancialRow('Zelle / Digital (USD)', expected.zelle, reported.zelle, diffs.zelle, '$');
        addFinancialRow('Otros (POS/Zinli/USD)', expected.other || 0, reported.other || 0, diffs.other || 0, '$'); 
        addFinancialRow('Pago Móvil (Bs)', expected.bs, reported.bs, diffs.bs, 'Bs');

        sheet.addRow([]); 

        const notesLabel = sheet.addRow(['NOTAS DEL CAJERO']);
        notesLabel.font = { bold: true };

        sheet.mergeCells(`A${sheet.rowCount}:D${sheet.rowCount}`); 
        const notesContent = sheet.addRow([ticket.notes || 'Sin notas registradas']);
        notesContent.alignment = { wrapText: true }; 

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        const shortId = ticket.id.split('-')[0].toUpperCase();
        const cleanDate = new Date(ticket.closed_at).toISOString().split('T')[0];

        link.href = url;
        link.setAttribute('download', `Cierre_Caja_${shortId}_${cleanDate}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); 

        const Toast = Swal.mixin({ 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 2000, 
            customClass: { popup: 'bg-neutral-950 text-white rounded-xl text-xs font-bold border border-neutral-800' } 
        });
        Toast.fire({ icon: 'success', title: 'Excel Descargado' });
    };

    // Animación estándar para los Modales/Drawers (Parte 2)
    const drawerVariants: Variants = {
        hidden: { x: "100%", opacity: 0.5 },
        visible: { x: 0, opacity: 1, transition: { type: "spring", damping: 28, stiffness: 250 } },
        exit: { x: "100%", opacity: 0, transition: { type: "tween", ease: "easeInOut", duration: 0.2 } },
    };

    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-24 font-sans text-neutral-900 flex flex-col antialiased selection:bg-neutral-950 selection:text-white">
            
            {/* HEADER NEO-EDITORIAL */}
            <header className="bg-[#FAFAFC]/95 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-3.5 flex justify-between items-center border-b border-neutral-200/60">
                <div className="flex items-center gap-3.5">
                    <Link
                        href="/admin"
                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-neutral-200/60 hover:border-neutral-400 transition-all shrink-0 shadow-xs active:scale-[0.98]"
                    >
                        <ArrowLeft size={15} className="text-neutral-500 hover:text-neutral-900" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-sm md:text-base tracking-tight leading-none text-neutral-900">
                            Caja de Control
                        </h1>
                        <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">
                            Conciliación y Auditoría Fiscal
                        </p>
                    </div>
                </div>
                
                <div className="bg-neutral-100/80 text-neutral-600 px-2.5 py-1 rounded border border-neutral-200/60 flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse shrink-0" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                        Turno Abierto
                    </span>
                </div>
            </header>

            {/* CONTENEDOR PRINCIPAL */}
            <main className="w-full max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-8">
                
                {/* SECCIÓN 1: EL EJE NARRATIVO (THE VAULT) */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h2 className="text-xs font-bold text-neutral-900 tracking-tight">
                                Efectivo en Gaveta
                            </h2>
                            <p className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono uppercase tracking-wider">
                                <Clock size={10} /> 
                                {lastClosureDate
                                    ? `Desde: ${new Date(lastClosureDate).toLocaleString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                                    : "Inicio de turno"}
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="animate-spin text-neutral-300" size={24} />
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-5">
                            
                            {/* EL MONOLITO DE EFECTIVO (Protagonista) */}
                            <div className="bg-neutral-950 p-6 md:p-8 rounded-2xl border border-neutral-800 flex flex-col justify-between relative overflow-hidden shadow-sm lg:w-[320px] shrink-0">
                                <div className="flex justify-between items-start mb-6">
                                    <p className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest">
                                        Efectivo Físico
                                    </p>
                                    <Banknote size={16} className="text-neutral-500" strokeWidth={1.5} />
                                </div>
                                <p className="text-5xl font-light tracking-tighter font-mono tabular-nums text-white leading-none">
                                    ${totals.usd_cash.toFixed(2)}
                                </p>
                            </div>

                            {/* LA ECUACIÓN FINANCIERA (Transparencia Total) */}
                            <div className="flex-1 bg-white rounded-2xl border border-neutral-200/60 p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-center">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-4 font-mono">
                                    Ecuación de Flujo
                                </p>
                                <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar pb-2">
                                    
                                    {/* Fondo Inicial (Base) */}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xl md:text-2xl font-medium tracking-tight font-mono text-neutral-900 tabular-nums">
                                            ${totals.base_in_cash.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-400 mt-1 uppercase">Fondo Base</span>
                                    </div>

                                    <Plus size={14} className="text-neutral-300 shrink-0" />

                                    {/* Ventas en Efectivo */}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xl md:text-2xl font-medium tracking-tight font-mono text-emerald-700/90 tabular-nums">
                                            ${totals.sales_cash.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-400 mt-1 uppercase">Ventas Caja</span>
                                    </div>

                                    <div className="w-3 h-px bg-neutral-300 shrink-0" /> {/* Minus sign abstract */}

                                    {/* Retiros / Gastos */}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xl md:text-2xl font-medium tracking-tight font-mono text-neutral-500 tabular-nums">
                                            ${totals.manual_out_cash.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-400 mt-1 uppercase">Retiros</span>
                                    </div>

                                    <div className="flex gap-1.5 items-center shrink-0 text-neutral-300 px-2">
                                        <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                        <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                    </div>

                                    {/* Total Esperado */}
                                    <div className="flex flex-col min-w-0 items-end border-l border-neutral-100 pl-4">
                                        <span className="text-xl md:text-2xl font-bold tracking-tight font-mono text-neutral-950 tabular-nums">
                                            ${totals.usd_cash.toFixed(2)}
                                        </span>
                                        <span className="text-[10px] font-mono text-neutral-950 font-bold mt-1 uppercase">Esperado</span>
                                    </div>

                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* SECCIÓN 2: FONDOS DIGITALES Y BANCOS */}
                {!loading && (
                    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Zelle */}
                        <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[110px]">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                    Zelle / Binance
                                </p>
                                <DollarSign size={14} className="text-neutral-400" strokeWidth={2} />
                            </div>
                            <p className="text-2xl font-medium tracking-tight font-mono tabular-nums text-neutral-900">
                                ${totals.zelle.toFixed(2)}
                            </p>
                        </div>

                        {/* Pago Móvil */}
                        <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[110px]">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                    Pago Móvil Bs
                                </p>
                                <CreditCard size={14} className="text-neutral-400" strokeWidth={2} />
                            </div>
                            <p className="text-2xl font-medium tracking-tight font-mono tabular-nums text-neutral-900">
                                <span className="text-xs mr-1 font-sans text-neutral-500">Bs</span>
                                {totals.bs_transfer.toLocaleString("es-VE", { maximumFractionDigits: 2 })}
                            </p>
                        </div>

                        {/* Otros POS */}
                        <div className="bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[110px]">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                    POS & Otros USD
                                </p>
                                <CreditCard size={14} className="text-neutral-400" strokeWidth={2} />
                            </div>
                            <p className="text-2xl font-medium tracking-tight font-mono tabular-nums text-neutral-900">
                                ${totals.other.toFixed(2)}
                            </p>
                        </div>
                    </section>
                )}

                {/* SECCIÓN 3: MACRO-ACCIONES OPERATIVAS */}
                <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    
                    {/* AJUSTE DE CAJA (BLANCO PURO) */}
                    <button
                        onClick={() => setIsMovementDrawerOpen(true)}
                        className="group relative p-6 md:p-8 rounded-2xl bg-white border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between items-start text-left min-h-[160px] hover:border-neutral-300 transition-all active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 rounded-full bg-neutral-100/80 flex items-center justify-center text-neutral-500 mb-4 group-hover:scale-110 group-hover:bg-neutral-200/80 transition-all">
                            <Plus size={16} strokeWidth={2} />
                        </div>
                        <div className="w-full">
                            <div className="flex items-center justify-between w-full">
                                <h3 className="font-bold text-base md:text-lg text-neutral-900 tracking-tight">
                                    Ajuste Manual
                                </h3>
                                <ArrowRight size={16} className="text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all" />
                            </div>
                            <p className="text-[11px] font-medium text-neutral-500 mt-1">Registrar fondo base o retiro por gastos.</p>
                        </div>
                    </button>

                    {/* CIERRE DIARIO (NEGRO OBSIDIANA) */}
                    <button
                        onClick={() =>
                            totals.orders_count > 0 || movementHistory.length > 0
                                ? setIsClosureDrawerOpen(true)
                                : Swal.fire({
                                    title: "Turno Vacío",
                                    text: "No se registran movimientos ni órdenes facturadas para auditar.",
                                    icon: "info",
                                    confirmButtonColor: "#0a0a0a",
                                    customClass: { popup: "rounded-2xl font-sans text-xs" }
                                  })
                        }
                        className="group relative p-6 md:p-8 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-sm flex flex-col justify-between items-start text-left min-h-[160px] hover:bg-neutral-900 hover:border-neutral-700 transition-all active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white mb-4 group-hover:scale-110 group-hover:bg-white/20 transition-all">
                            <Wallet size={16} strokeWidth={2} />
                        </div>
                        <div className="w-full">
                            <div className="flex items-center justify-between w-full">
                                <h3 className="font-bold text-base md:text-lg text-white tracking-tight">
                                    Auditoría y Cierre
                                </h3>
                                <ArrowRight size={16} className="text-neutral-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                            </div>
                            <p className="text-[11px] font-medium text-neutral-400 mt-1">Sellar jornada y emitir comprobante contable.</p>
                        </div>
                    </button>
                </section>

                {/* SECCIÓN 4: REGISTRO DE MOVIMIENTOS (TURNO ACTUAL) */}
                <section className="space-y-4 pt-4">
                    <h2 className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                        Ajustes del Turno Actual
                    </h2>
                    {movementHistory.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-neutral-200/60 p-8 flex flex-col items-center justify-center text-center shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            <p className="text-xs font-semibold text-neutral-400">No se registran alteraciones manuales en caja.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden divide-y divide-neutral-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            {movementHistory.map((mov) => {
                                const isIn = mov.type === 'in';
                                return (
                                    <div key={mov.id} className="flex items-center justify-between p-4 md:px-6 hover:bg-neutral-50/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${isIn ? 'bg-emerald-50/50 border-emerald-200/50 text-emerald-700' : 'bg-neutral-50 border-neutral-200/60 text-neutral-600'}`}>
                                                {isIn ? <ArrowDownToLine size={13} /> : <ArrowUpFromLine size={13} />}
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-xs text-neutral-950 leading-none">{mov.description || (isIn ? 'Fondo de Base' : 'Retiro / Gasto')}</p>
                                                <p className="text-[9px] text-neutral-400 font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                                    <span>{new Date(mov.created_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-300" />
                                                    <span>{mov.payment_method === 'cash' ? 'EFECTIVO' : mov.payment_method === 'zelle' ? 'DIGITAL' : mov.payment_method === 'other' ? 'OTROS POS' : 'BS TRANSFER'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm font-mono tabular-nums tracking-tight ${isIn ? 'text-emerald-700' : 'text-neutral-900'}`}>
                                                {isIn ? '+' : '-'}{mov.currency === 'usd' ? '$' : 'Bs '}{Number(mov.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

               {/* SECCIÓN 5: LIBRO Z (HISTORIAL DE CIERRES) */}
                <section className="space-y-4 pt-4">
                    <h2 className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-widest block">
                        Libro Z (Historial de Arqueos)
                    </h2>
                    {history.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-neutral-200/60 p-10 flex flex-col items-center justify-center text-center space-y-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                            <div className="w-10 h-10 bg-neutral-50 border border-neutral-200/50 rounded-xl flex items-center justify-center text-neutral-400">
                                <FileText size={18} />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm text-neutral-900">Sin historial contable</h3>
                                <p className="text-xs text-neutral-400 font-medium">Los tickets de arqueo consolidados aparecerán aquí.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((ticket) => {
                                // 🚀 PROTECCIÓN CONTRA HISTORIAL VIEJO (Saneamiento de floats)
                                const diffTotal = Number((
                                    Math.abs(ticket.differences.cash || 0) +
                                    Math.abs(ticket.differences.zelle || 0) +
                                    Math.abs(ticket.differences.bs || 0) +
                                    Math.abs(ticket.differences.other || 0)
                                ).toFixed(2));
                                
                                const isPerfect = diffTotal === 0;

                                return (
                                    <button
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="w-full bg-white p-5 rounded-2xl border border-neutral-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-neutral-300 hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group text-left transition-all active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-neutral-50 border border-neutral-200/60 rounded-xl flex items-center justify-center text-neutral-400 group-hover:bg-neutral-950 group-hover:text-white transition-colors shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-sm text-neutral-900 leading-none">
                                                    {new Date(ticket.closed_at).toLocaleDateString(
                                                        "es-VE",
                                                        { weekday: "long", day: "numeric", month: "long" },
                                                    )}
                                                </p>
                                                <p className="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider font-mono">
                                                    Turno cerrado a las {new Date(ticket.closed_at).toLocaleTimeString(
                                                        "es-VE",
                                                        { hour: "2-digit", minute: "2-digit" },
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 pl-14 sm:pl-0 shrink-0">
                                            <div
                                                className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 border font-mono ${isPerfect ? "bg-emerald-50/50 border-emerald-200/60 text-emerald-700" : "bg-rose-50/50 border-rose-200/60 text-rose-700"}`}
                                            >
                                                {isPerfect ? <CheckCircle size={10} strokeWidth={2.5} /> : <AlertCircle size={10} strokeWidth={2.5} />}
                                                <span>{isPerfect ? "Cuadre Exacto" : "Descuadre Reportado"}</span>
                                            </div>
                                            <ArrowRight
                                                size={15}
                                                className="text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all hidden sm:block"
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            {/* ========================================================= */}
            {/* DRAWER 1: MOVIMIENTOS (Ajuste Manual) */}
            {/* ========================================================= */}
            <AnimatePresence>
                {isMovementDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsMovementDrawerOpen(false)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[420px] bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-neutral-200/60"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0 border-b border-neutral-100">
                                <div className="space-y-1.5">
                                    <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-none">
                                        Ajuste Manual
                                    </h2>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                        Registro de ingresos o gastos
                                    </p>
                                </div>
                                <button
                                    onClick={() => !isSubmitting && setIsMovementDrawerOpen(false)}
                                    className="p-2 bg-neutral-50 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto overscroll-contain px-6 md:px-8 py-6 no-scrollbar">
                                <form
                                    id="movement-form"
                                    onSubmit={handleSubmitMovement}
                                    className="space-y-6"
                                >
                                    {/* Dirección de Fondos */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider block font-mono">
                                            Naturaleza del Ajuste
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setMovementData({ ...movementData, type: "out" })}
                                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold transition-all border ${movementData.type === "out" ? "bg-white border-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-neutral-950 scale-[1.02]" : "bg-neutral-50/50 border-neutral-200/60 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"}`}
                                            >
                                                <ArrowUpFromLine size={18} strokeWidth={2} /> 
                                                <span>Retiro / Gasto</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMovementData({ ...movementData, type: "in" })}
                                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-xs font-bold transition-all border ${movementData.type === "in" ? "bg-white border-neutral-950 shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-neutral-950 scale-[1.02]" : "bg-neutral-50/50 border-neutral-200/60 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"}`}
                                            >
                                                <ArrowDownToLine size={18} strokeWidth={2} /> 
                                                <span>Ingreso / Base</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Monto y Caja Afectada */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider block font-mono">
                                                Monto
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm font-mono">
                                                    {movementData.currency === "usd" ? "$" : "Bs"}
                                                </span>
                                                <NumberInput
                                                    step="0.01"
                                                    required
                                                    value={movementData.amount}
                                                    onChangeValue={(val) => setMovementData({ ...movementData, amount: val })} 
                                                    className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold outline-none transition-all placeholder:text-neutral-300 font-mono text-center shadow-xs"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2.5">
                                            <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider block font-mono">
                                                Caja Destino
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={movementData.paymentMethod}
                                                    onChange={(e) => {
                                                        const method = e.target.value;
                                                        setMovementData({
                                                            ...movementData,
                                                            paymentMethod: method,
                                                            currency: method === "transfer" ? "bs" : "usd",
                                                        });
                                                    }}
                                                    className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl px-3 py-2.5 text-xs font-bold text-neutral-900 outline-none transition-all cursor-pointer appearance-none shadow-xs"
                                                >
                                                    <option value="cash">Efectivo USD</option>
                                                    <option value="zelle">Zelle / Binance</option>
                                                    <option value="other">Otros POS</option>
                                                    <option value="transfer">Pago Móvil (Bs)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Concepto */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider block font-mono">
                                            Concepto / Razón
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={50}
                                            value={movementData.description}
                                            onChange={(e) => setMovementData({ ...movementData, description: e.target.value })}
                                            className="w-full bg-white border border-neutral-200/80 focus:border-neutral-950 rounded-xl px-3.5 py-3 text-xs font-bold outline-none transition-all placeholder:text-neutral-300 shadow-xs"
                                            placeholder="Ej: Pago a despachador, Sencillo..."
                                        />
                                    </div>
                                </form>
                            </div>
                            
                            {/* Footer Sticky */}
                            <div className="p-6 md:p-8 border-t border-neutral-100 bg-white shrink-0">
                                <button
                                    type="submit"
                                    form="movement-form"
                                    disabled={isSubmitting}
                                    className="w-full bg-neutral-950 hover:bg-black text-white font-bold text-xs uppercase tracking-widest py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-sm"
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <Save size={15} />
                                    )}
                                    <span>Registrar Movimiento</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* DRAWER 2: AUDITORÍA Y CIERRE DE CAJA */}
            {/* ========================================================= */}
            <AnimatePresence>
                {isClosureDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsClosureDrawerOpen(false)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[480px] bg-white h-[100dvh] flex flex-col shadow-2xl border-l border-neutral-200/60"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0 border-b border-neutral-100 bg-white z-10">
                                <div className="space-y-1.5">
                                    <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-none">
                                        Auditoría Final
                                    </h2>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                        Selle el turno e ingrese el conteo físico
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsClosureDrawerOpen(false)}
                                    className="p-2 bg-neutral-50 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                           <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 space-y-6 no-scrollbar">
                           
                                    {[
                                        { label: "Efectivo Físico", key: "cash", expected: totals.usd_cash, symbol: "$" },
                                        { label: "Zelle / Digitales", key: "zelle", expected: totals.zelle, symbol: "$" },
                                        { label: "Otros POS", key: "other", expected: totals.other, symbol: "$" },
                                        { label: "Pago Móvil / Transf.", key: "bs", expected: totals.bs_transfer, symbol: "Bs " },
                                    ].map((row) => {
                                        // 🚀 SANEAMIENTO UI: Eliminamos residuos micro-decimales para que el Cero sea Cero Absoluto
                                        const rawReported = Number((reportedTotals as any)[row.key]);
                                        const diff = Number((rawReported - row.expected).toFixed(2));
                                        const hasInput = (reportedTotals as any)[row.key] !== "";
                                    return (
                                        <div
                                            key={row.key}
                                            className="bg-white p-5 rounded-2xl border border-neutral-200/60 relative group focus-within:border-neutral-950 focus-within:ring-4 focus-within:ring-neutral-950/[0.03] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                        >
                                            <div className="flex justify-between items-end mb-4">
                                                <span className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider font-mono">
                                                    {row.label}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block mb-0.5">Esperado en sistema</span>
                                                    <span className="text-xs font-bold text-neutral-600 font-mono tabular-nums bg-neutral-100/80 px-2 py-0.5 rounded border border-neutral-200/60">
                                                        {row.symbol}{row.expected.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm font-mono">
                                                        {row.symbol.trim()}
                                                    </span>
                                                    <NumberInput
                                                        step="0.01"
                                                        placeholder="Monto contado..."
                                                        className="w-full bg-neutral-50 border border-neutral-200/80 focus:bg-white focus:border-neutral-950 rounded-xl pl-8 pr-3 py-2.5 text-sm font-bold text-neutral-900 outline-none transition-all placeholder:text-neutral-300 font-mono"
                                                        value={(reportedTotals as any)[row.key]}
                                                        onChangeValue={(val) => setReportedTotals({ ...reportedTotals, [row.key]: val })}
                                                    />
                                                </div>
                                                
                                                {hasInput && (
                                                    <div
                                                        className={`shrink-0 flex items-center justify-end sm:justify-center gap-1.5 font-bold text-xs px-3 py-2.5 rounded-xl border font-mono w-full sm:w-28 transition-colors ${diff === 0 ? "bg-emerald-50/80 border-emerald-200/60 text-emerald-700" : diff > 0 ? "bg-blue-50/80 border-blue-200/60 text-blue-700" : "bg-rose-50/80 border-rose-200/60 text-rose-700"}`}
                                                    >
                                                        {diff === 0 ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                                                        <span className="tabular-nums">
                                                            {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="space-y-2 pt-2">
                                    <label className="text-[10px] font-bold text-neutral-950 uppercase tracking-wider block font-mono">
                                        Observaciones de Cierre (Opcional)
                                    </label>
                                    <textarea
                                        placeholder="Ej: Faltante de $5 justificado por propinas..."
                                        className="w-full bg-white border border-neutral-200/80 rounded-xl px-3.5 py-3 text-xs font-medium text-neutral-900 outline-none focus:border-neutral-950 transition-all resize-none placeholder:text-neutral-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                        rows={3}
                                        value={closureNotes}
                                        onChange={(e) => setClosureNotes(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Footer Sticky */}
                            <div className="p-6 md:p-8 border-t border-neutral-100 bg-white shrink-0">
                                <button
                                    onClick={handleFinalClosure}
                                    disabled={
                                        isSubmitting ||
                                        reportedTotals.cash === "" ||
                                        reportedTotals.zelle === "" ||
                                        reportedTotals.bs === ""
                                    }
                                    className="w-full bg-neutral-950 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 shadow-sm border border-neutral-800"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="animate-spin" size={15} />
                                    ) : (
                                        <ShieldCheck size={16} />
                                    )}
                                    <span>Sellar y Auditar Turno</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* DRAWER 3: VISOR DE TICKET Z (RECIBO CONTABLE TÉRMICO) */}
            {/* ========================================================= */}
            <AnimatePresence>
                {selectedTicket && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm"
                            onClick={() => setSelectedTicket(null)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[400px] bg-neutral-50 h-[100dvh] flex flex-col shadow-2xl border-l border-neutral-200/60"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0 bg-white border-b border-neutral-200/60 z-10">
                                <div className="space-y-1.5">
                                    <h2 className="text-lg font-bold text-neutral-900 tracking-tight leading-none">
                                        Libro Z de Arqueo
                                    </h2>
                                    <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                                        <Clock size={11} /> 
                                        {new Date(selectedTicket.closed_at).toLocaleString("es-VE")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto overscroll-contain p-6 md:p-8 no-scrollbar">
                                <div className="bg-white p-6 rounded-2xl border border-neutral-200/60 space-y-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                    
                                    {/* CABECERA RECIBO TÉRMICO */}
                                    <div className="text-center border-b border-dashed border-neutral-200/60 pb-6 space-y-2.5">
                                        <div className="w-12 h-12 bg-neutral-950 text-white rounded-2xl flex items-center justify-center mx-auto border border-neutral-800 shadow-xs">
                                            <ShieldCheck size={22} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-widest">Auditoría Fiscal</h3>
                                            <p className="text-[10px] font-mono font-semibold text-neutral-400">
                                                REC-ID: {selectedTicket.id.split("-")[0].toUpperCase()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* DESGLOSE REPORTADO */}
                                    <div className="space-y-3.5">
                                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                            Arqueo Contado Declarado
                                        </p>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-neutral-500">Efectivo USD</span>
                                                <span className="font-bold font-mono text-neutral-900">${selectedTicket.reported_totals.cash.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-neutral-500">Zelle / Digital</span>
                                                <span className="font-bold font-mono text-neutral-900">${selectedTicket.reported_totals.zelle.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-neutral-500">Otros POS / Trj</span>
                                                <span className="font-bold font-mono text-neutral-900">${(selectedTicket.reported_totals.other || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2.5 border-t border-neutral-100/80">
                                                <span className="font-semibold text-neutral-500">Pago Móvil Bs</span>
                                                <span className="font-bold font-mono text-neutral-900">Bs {selectedTicket.reported_totals.bs.toLocaleString("es-VE")}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DIFERENCIAS REPORTADAS */}
                                    <div className="space-y-3 pt-3 border-t border-dashed border-neutral-200/60">
                                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest font-mono">
                                            Balance de Diferencias
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            {["cash", "zelle", "other", "bs"].map((key) => {
                                                const diff = selectedTicket.differences[key] || 0; 
                                                const isPerfect = diff === 0;
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`flex flex-col text-[10px] font-bold p-2.5 rounded-xl border ${isPerfect ? "bg-emerald-50/50 border-emerald-200/60 text-emerald-700" : diff > 0 ? "bg-blue-50/50 border-blue-200/60 text-blue-700" : "bg-rose-50/50 border-rose-200/60 text-rose-700"}`}
                                                    >
                                                        <span className="text-[8px] uppercase tracking-wider opacity-70">{key === "cash" ? "EFECTIVO" : key === "zelle" ? "ZELLE" : key === "other" ? "OTROS" : "PM BS"}</span>
                                                        <span className="font-mono text-xs mt-0.5">
                                                            {isPerfect ? "EXACTO" : diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* NOTAS */}
                                    {selectedTicket.notes && (
                                        <div className="pt-4 border-t border-dashed border-neutral-200/60">
                                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-2 font-mono">
                                                Observaciones del Turno
                                            </p>
                                            <p className="text-xs font-semibold text-neutral-600 bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-200/60 italic leading-relaxed">
                                                "{selectedTicket.notes}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ACCIONES DE EXPORTACIÓN */}
                            <div className="p-6 md:p-8 bg-white border-t border-neutral-100 shrink-0 flex gap-3">
                                <button
                                    onClick={() => handleCopyWhatsApp(selectedTicket)}
                                    className="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-[#20ba59] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Copy size={14} /> WhatsApp
                                </button>
                                <button
                                    onClick={() => handleDownloadExcel(selectedTicket)}
                                    className="flex-1 bg-neutral-950 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm border border-neutral-800"
                                >
                                    <Download size={14} /> Excel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}