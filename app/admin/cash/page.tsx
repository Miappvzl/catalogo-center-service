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
    ShieldCheck,
    Loader2,
    XCircle,
    Save,
    ArrowDownToLine,
    ArrowUpFromLine,
    CheckCircle,
    CheckCircle2,
    AlertTriangle,
    FileText,
    Copy, 
    Clock, 
    Sparkles, 
    X, 
    Download,
    Eye,
    EyeOff,
    AlertCircle
} from "lucide-react";
import ExcelJS from 'exceljs';
import Link from "next/link";
import { getSupabase } from "@/lib/supabase-client";
import { NumberInput } from "@/components/NumberInput"; 
import { AnimatePresence, motion, Variants } from "framer-motion";
import Swal from "sweetalert2";

export default function CashRegisterPage() {
    const IS_UNDER_CONSTRUCTION = false;

    const supabase = getSupabase();
    const [loading, setLoading] = useState(true);
    const [storeId, setStoreId] = useState<string | null>(null);

    // Totales y Contexto Temporal
    const [totals, setTotals] = useState({
        usdCash: 0,
        zelle: 0,
        bsTransfer: 0,
        other: 0, 
        ordersCount: 0,
    });
    const [lastClosureDate, setLastClosureDate] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    
    // Historial de ingresos/egresos manuales
    const [movementHistory, setMovementHistory] = useState<any[]>([])

    // Data para el Gráfico de Anillo y Estado Interactivo (Colores Muted de Alta Gama)
    const [activeSegment, setActiveSegment] = useState<string | null>(null);
    const [orderStats, setOrderStats] = useState({
        pending: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#D97706", // Muted Amber
            label: "Pendientes",
            key: "pending",
        },
        paid: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#059669", // Muted Emerald
            label: "Pagados",
            key: "paid",
        },
        shipped: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#2563EB", // Muted Blue
            label: "Enviados",
            key: "shipped",
        },
        cancelled: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#DC2626", // Muted Rose
            label: "Cancelados",
            key: "cancelled",
        },
    });

    // --- ESTADOS DE DRAWERS ---
    const [isMovementDrawerOpen, setIsMovementDrawerOpen] = useState(false);
    const [isClosureDrawerOpen, setIsClosureDrawerOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [movementData, setMovementData] = useState({
        type: "out",
        amount: "" as number | "", 
        currency: "usd",
        paymentMethod: "cash",
        description: "",
    });
    const [reportedTotals, setReportedTotals] = useState({
        cash: "",
        zelle: "",
        bs: "",
        other: "", 
    });
    const [closureNotes, setClosureNotes] = useState("");

    // 1. Inicialización
    useEffect(() => {
        const initStore = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (user) {
                const { data: store } = await supabase
                    .from("stores")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();
                if (store) setStoreId(store.id);
            }
        };
        initStore();
    }, [supabase]);

    // 2. Motores de Datos
    const fetchHistoryAndContext = useCallback(async () => {
        if (!storeId) return

        // Obtener Historial de Cierres
        const { data: closures } = await supabase
            .from('cash_closures')
            .select('*')
            .eq('store_id', storeId)
            .order('closed_at', { ascending: false })
            .limit(10)

        if (closures && closures.length > 0) {
            setHistory(closures)
            setLastClosureDate(closures[0].closed_at)
        }

        // Obtener Historial de Ajustes (Ingresos/Egresos)
        const { data: movements } = await supabase
            .from('cash_movements')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
            .limit(15)

        if (movements) {
            setMovementHistory(movements)
        }
    }, [supabase, storeId])

    const calculateFloatingCash = useCallback(async () => {
        if (!storeId) return;
        try {
            const [ordersRes, movementsRes] = await Promise.all([
                supabase
                    .from("orders")
                    .select("status, total_usd, total_bs, split_payments, payment_method")
                    .eq("store_id", storeId)
                    .is("closure_id", null)
                    .in("status", ["paid", "shipped", "completed"]), 
                supabase
                    .from("cash_movements")
                    .select("type, amount, payment_method")
                    .eq("store_id", storeId)
                    .is("closure_id", null),
            ]);

            const floatingOrders = ordersRes.data;
            const floatingMovements = movementsRes.data;

            let tCash = 0, tZelle = 0, tBs = 0, tOther = 0;

            const stats = {
                pending: { count: 0, usd: 0, bs: 0, color: "#D97706", label: "Pendientes", key: "pending" },
                paid: { count: 0, usd: 0, bs: 0, color: "#059669", label: "Pagados", key: "paid" },
                shipped: { count: 0, usd: 0, bs: 0, color: "#2563EB", label: "Enviados", key: "shipped" },
                cancelled: { count: 0, usd: 0, bs: 0, color: "#DC2626", label: "Cancelados", key: "cancelled" },
            };

            const routeFunds = (method: string, amountUsd: number, amountBs: number) => {
                const m = (method || "").toLowerCase();
                if (m.includes("efectivo") || m === "cash" || m === "usd") {
                    tCash += amountUsd;
                } else if (m.includes("zelle") || m.includes("binance")) {
                    tZelle += amountUsd;
                } else if (m.includes("pago móvil") || m.includes("pago movil") || m.includes("transferencia")) {
                    tBs += amountBs;
                } else {
                    tOther += amountUsd; 
                }
            };

            floatingOrders?.forEach((order: any) => {
                const rawStatus = order.status || "pending";
                const st = (rawStatus === "completed" ? "shipped" : rawStatus) as keyof typeof stats;
                if (stats[st]) {
                    stats[st].count += 1;
                    stats[st].usd += Number(order.total_usd || 0);
                    stats[st].bs += Number(order.total_bs || 0);
                }

                if (["paid", "shipped", "completed"].includes(rawStatus)) {
                    if (Array.isArray(order.split_payments) && order.split_payments.length > 0) {
                        order.split_payments.forEach((p: any) => routeFunds(p.method, Number(p.amount_usd || 0), Number(p.amount_bs || 0)));
                    } else {
                        const amountUsd = Number(order.total_usd || 0);
                        routeFunds(order.payment_method, amountUsd, Number(order.total_bs || amountUsd * order.exchange_rate));
                    }
                }
            });

            floatingMovements?.forEach((mov: any) => {
                const amt = Number(mov.amount) * (mov.type === "out" ? -1 : 1);
                routeFunds(mov.payment_method, amt, amt); 
            });

            const ordersToClose = stats.paid.count + stats.shipped.count;

            setTotals({ usdCash: tCash, zelle: tZelle, bsTransfer: tBs, other: tOther, ordersCount: ordersToClose });
            setOrderStats(stats);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [supabase, storeId]);

    useEffect(() => {
        if (storeId) {
            calculateFloatingCash();
            fetchHistoryAndContext();
        }
    }, [calculateFloatingCash, fetchHistoryAndContext, storeId]);

    const handleSubmitMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;
        const numAmount = Number(movementData.amount);
        if (numAmount <= 0) {
            Swal.fire({
                icon: "error",
                title: "Monto Inválido",
                text: "El monto a ajustar debe ser obligatoriamente mayor a 0.",
                confirmButtonColor: "#171717",
                customClass: { popup: "rounded-xl font-sans text-xs" },
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
                    popup: "bg-neutral-900 text-white rounded-lg text-xs font-semibold border border-neutral-800",
                },
            });
            Toast.fire({ icon: "success", title: "Operación Registrada" });
            await calculateFloatingCash();
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
                confirmButtonColor: "#171717",
                customClass: { popup: "rounded-xl font-sans text-xs" },
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalClosure = async () => {
        if (!storeId || totals.ordersCount === 0) return;
        setIsSubmitting(true);
        const expected = { cash: totals.usdCash, zelle: totals.zelle, bs: totals.bsTransfer, other: totals.other };
        const reported = { cash: Number(reportedTotals.cash), zelle: Number(reportedTotals.zelle), bs: Number(reportedTotals.bs), other: Number(reportedTotals.other) };
        const diffs = { cash: reported.cash - expected.cash, zelle: reported.zelle - expected.zelle, bs: reported.bs - expected.bs, other: reported.other - expected.other };
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
                confirmButtonColor: "#171717",
                customClass: { popup: "rounded-xl font-sans text-xs" },
            });
            setIsClosureDrawerOpen(false);
            setReportedTotals({ cash: "", zelle: "", bs: "", other: "" });
            setClosureNotes("");
            await calculateFloatingCash();
            await fetchHistoryAndContext() 
            await fetchHistoryAndContext();
        } catch (e) {
            Swal.fire({
                title: "Error de Consolidación",
                text: "No se pudo procesar el cierre contable.",
                icon: "error",
                confirmButtonColor: "#171717",
                customClass: { popup: "rounded-xl font-sans text-xs" }
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
                popup: "bg-neutral-900 text-white rounded-lg text-xs font-semibold border border-neutral-800",
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
            customClass: { popup: 'bg-neutral-900 text-white rounded-xl text-xs font-semibold border border-neutral-800' } 
        });
        Toast.fire({ icon: 'success', title: 'Excel Contable Descargado' });
    };

    const drawerVariants: Variants = {
        hidden: { x: "100%", opacity: 0.5 },
        visible: {
            x: 0,
            opacity: 1,
            transition: { type: "spring", damping: 25, stiffness: 200 },
        },
        exit: {
            x: "100%",
            opacity: 0,
            transition: { type: "tween", ease: "easeInOut", duration: 0.2 },
        },
    };

    if (IS_UNDER_CONSTRUCTION) {
        return (
            <div className="min-h-screen bg-[#FAFAFC] pb-24 font-sans text-neutral-900 flex flex-col relative antialiased">
                <header className="bg-[#FAFAFC]/95 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center border-b border-neutral-200/50">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/admin"
                            className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-colors shrink-0 shadow-xs"
                        >
                            <ArrowLeft size={16} className="text-neutral-500 hover:text-neutral-900" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-base tracking-tight leading-none text-neutral-900">
                                Finanzas
                            </h1>
                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">
                                Auditoría de Caja
                            </p>
                        </div>
                    </div>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-12">
                    <motion.div
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-neutral-200/50 shadow-xs mb-6 text-neutral-400"
                    >
                        <Sparkles size={24} />
                    </motion.div>
                    <h2 className="text-xl font-bold text-neutral-950 mb-3 tracking-tight leading-snug">
                        El control consolidado de sus finanzas, <br />
                        está en camino.
                    </h2>
                    <p className="text-xs font-medium text-neutral-400 max-w-sm mx-auto mb-8 leading-relaxed">
                        Estamos desplegando un motor de auditoría automatizada que le permitirá conciliar efectivo, Zelle y Pago Móvil de forma transparente sin configuraciones complejas.
                    </p>
                    <div className="inline-flex items-center gap-1.5 bg-neutral-900 text-white px-3.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider shadow-xs">
                        <ShieldCheck size={12} /> Próximamente en Preziso
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAFC] pb-24 font-sans text-neutral-900 flex flex-col relative antialiased selection:bg-neutral-950 selection:text-white">
            
            {/* HEADER PRINCIPAL */}
            <header className="bg-[#FAFAFC]/95 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 py-4 flex justify-between items-center border-b border-neutral-200/50">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-neutral-200/50 hover:border-neutral-300 transition-all shrink-0 shadow-xs active:scale-[0.98]"
                    >
                        <ArrowLeft size={16} className="text-neutral-500 hover:text-neutral-900" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-base tracking-tight leading-none text-neutral-900">
                            Caja de Control
                        </h1>
                        <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-1 font-mono">
                            Conciliación y Cierres Diarios
                        </p>
                    </div>
                </div>
                
                <div className="bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-100/40 ">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">
                        Turno Activo
                    </span>
                </div>
            </header>

            {/* SECCIÓN MÁXIMA ESCALADA (CLOSER TO SCREEN) */}
            <main className="w-full max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
                
                {/* SECCIÓN 1: DINERO EN TRÁNSITO */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                                Flujo de Caja en Tránsito
                            </h2>
                            <p className="text-[10px] text-neutral-400 flex items-center gap-1 font-mono">
                                <Clock size={10} /> Apertura:{" "}
                                {lastClosureDate
                                    ? new Date(lastClosureDate).toLocaleString("es-VE", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    : "Inicio de turno"}
                            </p>
                        </div>
                        <span className="text-[10px] font-semibold bg-white text-neutral-700 px-2.5 py-1 rounded border border-neutral-200/50 shadow-xs font-mono">
                            {totals.ordersCount} Órdenes por Archivar
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="animate-spin text-neutral-300" size={20} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            {/* EFECTIVO */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200/50 flex flex-col justify-between min-h-[130px] relative overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider leading-tight">
                                        Efectivo
                                        <br />
                                        Físico USD
                                    </p>
                                    <div className="w-7 h-7 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400 shrink-0 border border-neutral-100">
                                        <Banknote size={14} />
                                    </div>
                                </div>
                                <p className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${totals.usdCash < 0 ? "text-rose-600" : "text-neutral-900"}`}>
                                    ${totals.usdCash.toFixed(2)}
                                </p>
                            </div>

                            {/* ZELLE */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200/50 flex flex-col justify-between min-h-[130px] relative overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider leading-tight">
                                        Zelle /
                                        <br />
                                        Binance Pay
                                    </p>
                                    <div className="w-7 h-7 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400 shrink-0 border border-neutral-100">
                                        <DollarSign size={14} />
                                    </div>
                                </div>
                                <p className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${totals.zelle < 0 ? "text-rose-600" : "text-neutral-900"}`}>
                                    ${totals.zelle.toFixed(2)}
                                </p>
                            </div>

                            {/* PAGO MÓVIL */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200/50 flex flex-col justify-between min-h-[130px] relative overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider leading-tight">
                                        Transferencias
                                        <br />
                                        Pago Móvil Bs
                                    </p>
                                    <div className="w-7 h-7 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400 shrink-0 border border-neutral-100">
                                        <CreditCard size={14} />
                                    </div>
                                </div>
                                <p className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${totals.bsTransfer < 0 ? "text-rose-600" : "text-neutral-900"}`}>
                                    <span className="text-base mr-0.5 font-sans font-semibold">Bs</span>
                                    {totals.bsTransfer.toLocaleString("es-VE", {
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </div>

                            {/* OTROS DIGITALES */}
                            <div className="bg-white p-5 rounded-xl border border-neutral-200/50 flex flex-col justify-between min-h-[130px] relative overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider leading-tight">
                                        Puntos de Venta
                                        <br />
                                        &amp; Otros USD
                                    </p>
                                    <div className="w-7 h-7 bg-neutral-50 rounded-lg flex items-center justify-center text-neutral-400 shrink-0 border border-neutral-100">
                                        <CreditCard size={14} />
                                    </div>
                                </div>
                                <p className={`text-2xl font-bold tracking-tight font-mono tabular-nums ${totals.other < 0 ? "text-rose-600" : "text-neutral-900"}`}>
                                    ${totals.other.toFixed(2)}
                                </p>
                            </div>

                        </div>
                    )}
                </section>

                {/* SECCIÓN 1.5: PULSO OPERATIVO (GRÁFICO DE ANILLO REDISEÑADO) */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                        Pulso General del Turno
                    </h2>
                    <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col lg:flex-row items-center gap-8 lg:gap-12 min-h-[220px]">
                        
                        {/* SVG Vectorial Interactivo */}
                        <div
                            className="relative w-36 h-40 shrink-0 flex items-center justify-center cursor-pointer"
                            onClick={() => setActiveSegment(null)}
                        >
                            <svg viewBox="-2 0 40 36" className="w-full h-full -rotate-90">
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9155"
                                    fill="transparent"
                                    stroke="#F5F5F7"
                                    strokeWidth="2.5"
                                />
                                {(() => {
                                    const total = Object.values(orderStats).reduce(
                                        (acc, curr) => acc + curr.count,
                                        0,
                                    );
                                    let offset = 0;

                                    if (total === 0) return null;

                                    return Object.values(orderStats).map((stat) => {
                                        if (stat.count === 0) return null;
                                        const percentage = (stat.count / total) * 100;
                                        const strokeDasharray = `${percentage} ${100 - percentage}`;
                                        const strokeDashoffset = -offset;
                                        offset += percentage;

                                        const isMuted = activeSegment && activeSegment !== stat.key;

                                        return (
                                            <circle
                                                key={stat.key}
                                                cx="18"
                                                cy="18"
                                                r="15.9155"
                                                fill="transparent"
                                                stroke={stat.color}
                                                strokeWidth="3.5"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                className={`transition-all duration-300 ease-out hover:stroke-[5px] ${isMuted ? "opacity-20" : "opacity-100"} cursor-pointer`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveSegment(
                                                        activeSegment === stat.key ? null : stat.key,
                                                    );
                                                }}
                                            />
                                        );
                                    });
                                })()}
                            </svg>
                            
                            {/* Centro del Anillo Dinámico */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-300">
                                <span
                                    className="text-2xl font-bold tracking-tight text-neutral-900 leading-none font-mono"
                                    style={{
                                        color: activeSegment
                                            ? (orderStats as any)[activeSegment].color
                                            : "#171717",
                                    }}
                                >
                                    {activeSegment
                                        ? (orderStats as any)[activeSegment].count
                                        : Object.values(orderStats).reduce(
                                            (acc, curr) => acc + curr.count,
                                            0,
                                        )}
                                </span>
                                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                                    {activeSegment
                                        ? (orderStats as any)[activeSegment].label
                                        : "Total"}
                                </span>
                            </div>
                        </div>

                        {/* Leyenda y Datos */}
                        <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(orderStats).map(([key, stat]) => {
                                const isActive = activeSegment === key;
                                const isMuted = activeSegment && activeSegment !== key;

                                return (
                                    <div
                                        key={key}
                                        onClick={() => setActiveSegment(isActive ? null : key)}
                                        className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[95px]
                                            ${isActive ? "bg-white shadow-xs border-neutral-400 scale-[1.01]" : "bg-neutral-50/50 border-neutral-200/50"} 
                                            ${isMuted ? "opacity-40 grayscale" : "opacity-100"}
                                            hover:bg-white hover:border-neutral-300
                                        `}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: stat.color }}
                                            />
                                            <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider truncate">
                                                {stat.label}
                                            </p>
                                        </div>
                                        <p className="text-xl font-bold text-neutral-900 leading-none font-mono">
                                            {stat.count}
                                        </p>
                                        <div className="mt-1 transition-opacity duration-300">
                                            <p className="text-[10px] font-mono text-neutral-400 font-semibold uppercase">
                                                <span>${stat.usd.toFixed(0)}</span>
                                                <span className="text-neutral-300 px-1">•</span>
                                                <span>Bs {stat.bs.toFixed(0)}</span>
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 2: ACCIONES OPERATIVAS */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                        Operaciones de Caja
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        {/* AJUSTE DE CAJA */}
                        <button
                            onClick={() => setIsMovementDrawerOpen(true)}
                            className="bg-white p-5 rounded-xl border border-neutral-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-neutral-300 flex items-center justify-between gap-5 text-left group transition-all duration-150 active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-neutral-50 border border-neutral-200/50 rounded-lg flex items-center justify-center text-neutral-500 group-hover:bg-neutral-900 group-hover:text-white transition-colors duration-200 shrink-0">
                                    <Plus size={18} />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-semibold text-sm text-neutral-900">Ajuste de Caja Manual</h3>
                                    <p className="text-[11px] font-medium text-neutral-400">Registrar retiros de caja o ingresos de base.</p>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-neutral-300 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                        </button>

                        {/* CIERRE DIARIO */}
                        <button
                            onClick={() =>
                                totals.ordersCount > 0
                                    ? setIsClosureDrawerOpen(true)
                                    : Swal.fire({
                                        title: "Turno Vacío",
                                        text: "No se registran órdenes facturadas listas para arqueo.",
                                        icon: "info",
                                        confirmButtonColor: "#171717",
                                        customClass: { popup: "rounded-xl font-sans text-xs" }
                                      })
                            }
                            className="bg-neutral-950 p-5 rounded-xl border border-transparent hover:bg-black flex items-center justify-between gap-5 text-left group transition-all duration-150 active:scale-[0.99] shadow-sm text-white"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <Wallet size={16} />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-semibold text-sm">Cierre de Jornada</h3>
                                    <p className="text-[11px] font-medium text-neutral-400">Sellar el arqueo fiscal de {totals.ordersCount} órdenes.</p>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-neutral-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                        </button>

                    </div>
                </section>

                {/* SECCIÓN 2.5: ÚLTIMOS AJUSTES DE CAJA (INGRESO / RETIRO) */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                        Ajustes del Turno Actual
                    </h2>
                    {movementHistory.length === 0 ? (
                        <div className="bg-white rounded-xl border border-neutral-200/50 p-6 flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-semibold text-neutral-400">No se registran movimientos manuales de caja.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-neutral-200/50 overflow-hidden divide-y divide-neutral-100">
                            {movementHistory.map((mov) => {
                                const isIn = mov.type === 'in';
                                return (
                                    <div key={mov.id} className="flex items-center justify-between p-4 hover:bg-neutral-50/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${isIn ? 'bg-emerald-50 border-emerald-100/40 text-emerald-700' : 'bg-rose-50 border-rose-100/40 text-rose-700'}`}>
                                                {isIn ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="font-semibold text-xs text-neutral-900 leading-tight">{mov.description || (isIn ? 'Ingreso de Base' : 'Retiro por Gasto')}</p>
                                                <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5">
                                                    <span>{new Date(mov.created_at).toLocaleDateString('es-VE')}</span>
                                                    <span className="w-1 h-1 rounded-full bg-neutral-200" />
                                                    <span>{mov.payment_method === 'cash' ? 'Efectivo USD' : mov.payment_method === 'zelle' ? 'Zelle/Digital' : mov.payment_method === 'other' ? 'Otros POS' : 'Pago Móvil Bs'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm font-mono tracking-tight ${isIn ? 'text-emerald-700' : 'text-neutral-900'}`}>
                                                {isIn ? '+' : '-'}{mov.currency === 'usd' ? '$' : 'Bs '}{Number(mov.amount).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* SECCIÓN 3: HISTORIAL DE CIERRES */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                        Historial de Cierres Consolidados (Libro Z)
                    </h2>
                    {history.length === 0 ? (
                        <div className="bg-white rounded-xl border border-neutral-200/50 p-10 flex flex-col items-center justify-center text-center space-y-3">
                            <div className="w-10 h-10 bg-neutral-50 border border-neutral-200/50 rounded-lg flex items-center justify-center text-neutral-400">
                                <FileText size={18} />
                            </div>
                            <div className="space-y-0.5">
                                <h3 className="font-bold text-xs text-neutral-900">No se registran cierres anteriores</h3>
                                <p className="text-xs text-neutral-400">Los tickets de arqueo consolidados se indexarán en esta sección.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((ticket) => {
                                const diffTotal =
                                    Math.abs(ticket.differences.cash) +
                                    Math.abs(ticket.differences.zelle) +
                                    Math.abs(ticket.differences.bs);
                                const isPerfect = diffTotal === 0;

                                return (
                                    <button
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="w-full bg-white p-4.5 rounded-xl border border-neutral-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.01)] hover:border-neutral-300/80 hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 group text-left transition-all active:scale-[0.99]"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-8 h-8 bg-neutral-50 border border-neutral-200/50 rounded-lg flex items-center justify-center text-neutral-400 group-hover:bg-neutral-900 group-hover:text-white transition-colors shrink-0">
                                                <FileText size={15} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs text-neutral-900 leading-tight">
                                                    {new Date(ticket.closed_at).toLocaleDateString(
                                                        "es-VE",
                                                        { weekday: "long", day: "numeric", month: "long" },
                                                    )}
                                                </p>
                                                <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider font-mono mt-0.5">
                                                    Arqueado: {new Date(ticket.closed_at).toLocaleTimeString(
                                                        "es-VE",
                                                        { hour: "2-digit", minute: "2-digit" },
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3.5 pl-11 sm:pl-0 shrink-0">
                                            <div
                                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${isPerfect ? "bg-emerald-50 border-emerald-100/40 text-emerald-700" : "bg-rose-50 border-rose-100/40 text-rose-700"}`}
                                            >
                                                {isPerfect ? (
                                                    <CheckCircle2 size={11} />
                                                ) : (
                                                    <AlertCircle size={11} />
                                                )}
                                                <span>{isPerfect ? "Arqueo Cuadrado" : "Diferencias Reportadas"}</span>
                                            </div>
                                            <ArrowRight
                                                size={14}
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
            {/* DRAWER 1: MOVIMIENTOS (Ajustes de Caja Manuales) */}
            {/* ========================================================= */}
            <AnimatePresence>
                {isMovementDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs"
                            onClick={() => !isSubmitting && setIsMovementDrawerOpen(false)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[440px] bg-white h-full flex flex-col shadow-2xl border-l border-neutral-200/50"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-neutral-900 tracking-tight leading-none">
                                        Ajuste de Caja Manual
                                    </h2>
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-2 font-mono">
                                        Registro de ingresos o gastos
                                    </p>
                                </div>
                                <button
                                    onClick={() => !isSubmitting && setIsMovementDrawerOpen(false)}
                                    className="p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 no-scrollbar">
                                <form
                                    id="movement-form"
                                    onSubmit={handleSubmitMovement}
                                    className="space-y-6 mt-1"
                                >
                                    {/* Dirección de Fondos */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                                            Sentido del Ajuste
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setMovementData({ ...movementData, type: "out" })}
                                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all border ${movementData.type === "out" ? "bg-rose-50 border-rose-200/50 text-rose-700" : "bg-neutral-50/50 border-neutral-200/50 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"}`}
                                            >
                                                <ArrowUpFromLine size={16} /> Gasto / Retiro
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMovementData({ ...movementData, type: "in" })}
                                                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all border ${movementData.type === "in" ? "bg-emerald-50 border-emerald-200/50 text-emerald-700" : "bg-neutral-50/50 border-neutral-200/50 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600"}`}
                                            >
                                                <ArrowDownToLine size={16} /> Ingreso / Base
                                            </button>
                                        </div>
                                    </div>

                                    {/* Monto y Caja Afectada */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                                                Monto a Ajustar
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">
                                                    {movementData.currency === "usd" ? "$" : "Bs"}
                                                </span>
                                                <NumberInput
                                                    step="0.01"
                                                    required
                                                    value={movementData.amount}
                                                    onChangeValue={(val) => setMovementData({ ...movementData, amount: val })} 
                                                    className="w-full bg-neutral-50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg pl-8 pr-3 py-2 text-xs font-bold outline-none transition-all placeholder:text-neutral-300 font-mono text-center"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
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
                                                    className="w-full bg-neutral-50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg px-3 py-2 text-xs font-semibold text-neutral-900 outline-none transition-all cursor-pointer appearance-none"
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
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                                            Concepto / Explicación
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={50}
                                            value={movementData.description}
                                            onChange={(e) => setMovementData({ ...movementData, description: e.target.value })}
                                            className="w-full bg-neutral-50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg px-3 py-2 text-xs font-semibold outline-none transition-all placeholder:text-neutral-300"
                                            placeholder="Ej: Pago a despachador, Sencillo inicial..."
                                        />
                                    </div>

                                    {/* Botón Guardar */}
                                    <div className="pt-4 border-t border-neutral-100 flex items-center md:mb-0 mb-12">
                                        <button
                                            type="submit"
                                            form="movement-form"
                                            disabled={isSubmitting}
                                            className="w-full bg-neutral-950 hover:bg-black text-white font-semibold text-xs uppercase tracking-wider py-3 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-50"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 size={13} className="animate-spin" />
                                            ) : (
                                                <Save size={13} />
                                            )}
                                            <span>Registrar Ajuste</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* DRAWER 2: ARQUEO DE CAJA DIARIO */}
            {/* ========================================================= */}
            <AnimatePresence>
                {isClosureDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs"
                            onClick={() => !isSubmitting && setIsClosureDrawerOpen(false)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[460px] bg-white h-full flex flex-col shadow-2xl border-l border-neutral-200/50"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-neutral-900 tracking-tight leading-none">
                                        Arqueo Contable de Turno
                                    </h2>
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mt-2 font-mono">
                                        Introduzca el arqueo físico de caja
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsClosureDrawerOpen(false)}
                                    className="p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 space-y-6 no-scrollbar">
                                <div className="space-y-4 mt-1">
                                    {[
                                        { label: "Efectivo USD", key: "cash", expected: totals.usdCash, symbol: "$" },
                                        { label: "Zelle / Binance", key: "zelle", expected: totals.zelle, symbol: "$" },
                                        { label: "Otros (POS/Digital)", key: "other", expected: totals.other, symbol: "$" },
                                        { label: "Pago Móvil Bs", key: "bs", expected: totals.bsTransfer, symbol: "Bs " },
                                    ].map((row) => {
                                        const diff = Number((reportedTotals as any)[row.key]) - row.expected;
                                        const hasInput = (reportedTotals as any)[row.key] !== "";
                                        
                                        return (
                                            <div
                                                key={row.key}
                                                className="bg-white p-4 rounded-xl border border-neutral-200/50 relative overflow-hidden group focus-within:border-neutral-300 transition-all shadow-xs"
                                            >
                                                {hasInput && (
                                                    <div className={`absolute top-0 bottom-0 left-0 w-1 ${diff === 0 ? "bg-emerald-500" : diff > 0 ? "bg-blue-500" : "bg-rose-500"}`} />
                                                )}
                                                
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                                                        {row.label}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-50 border border-neutral-200/50 px-2 py-0.5 rounded font-mono">
                                                        Sistema: {row.symbol}{row.expected.toFixed(2)}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-xs font-mono">
                                                            {row.symbol.trim()}
                                                        </span>
                                                        <NumberInput
                                                            step="0.01"
                                                            placeholder="Monto físico contado..."
                                                            className="w-full bg-neutral-50 border border-neutral-200/50 focus:bg-white focus:border-neutral-400 rounded-lg pl-7 pr-3 py-2 text-xs font-bold text-neutral-900 outline-none transition-all placeholder:text-neutral-300 font-mono"
                                                            value={(reportedTotals as any)[row.key]}
                                                            onChangeValue={(val) => setReportedTotals({ ...reportedTotals, [row.key]: val })}
                                                        />
                                                    </div>
                                                    
                                                    {hasInput && (
                                                        <div
                                                            className={`shrink-0 flex items-center justify-end sm:justify-start gap-1 font-bold text-xs px-2.5 py-1.5 rounded border font-mono ${diff === 0 ? "bg-emerald-50 border-emerald-100 text-emerald-700" : diff > 0 ? "bg-blue-50 border-blue-100 text-blue-700" : "bg-rose-50 border-rose-100 text-rose-700"}`}
                                                        >
                                                            {diff === 0 ? (
                                                                <CheckCircle size={12} />
                                                            ) : (
                                                                <AlertCircle size={12} />
                                                            )}
                                                            <span className="whitespace-nowrap">
                                                                {diff > 0 ? "+" : ""}
                                                                {diff.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                                        Observaciones de Cierre (Opcional)
                                    </label>
                                    <textarea
                                        placeholder="Ej: Faltantes debidos a vueltos pendientes..."
                                        className="w-full bg-neutral-50 border border-neutral-200/50 rounded-lg px-3 py-2.5 text-xs font-semibold text-neutral-900 outline-none focus:bg-white focus:border-neutral-400 transition-all resize-none placeholder:text-neutral-300"
                                        rows={3}
                                        value={closureNotes}
                                        onChange={(e) => setClosureNotes(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 border-t border-neutral-100 flex items-center md:mb-6 mb-12">
                                    <button
                                        onClick={handleFinalClosure}
                                        disabled={
                                            isSubmitting ||
                                            reportedTotals.cash === "" ||
                                            reportedTotals.zelle === "" ||
                                            reportedTotals.bs === ""
                                        }
                                        className="w-full bg-neutral-950 text-white py-3 rounded-lg font-semibold text-xs uppercase tracking-wider hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:scale-100 shadow-xs"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="animate-spin" size={13} />
                                        ) : (
                                            <Save size={13} />
                                        )}
                                        <span>Cerrar Turno y Sellar</span>
                                    </button>
                                </div>
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
                    <div className="fixed inset-0 z-[100] flex justify-end scrollbar-thin no-scrollbar overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-neutral-900/30 backdrop-blur-xs"
                            onClick={() => setSelectedTicket(null)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[380px] bg-neutral-50 h-full flex flex-col shadow-2xl border-l border-neutral-200/50"
                        >
                            <div className="p-6 flex justify-between items-start shrink-0 bg-white border-b border-neutral-200/50">
                                <div className="space-y-1">
                                    <h2 className="text-base font-bold text-neutral-900 tracking-tight leading-none">
                                        Resumen de Arqueo (Z)
                                    </h2>
                                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1">
                                        <Clock size={11} />{" "}
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

                            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin no-scrollbar">
                                <div className="bg-white p-5 rounded-xl border border-neutral-200/50 space-y-5 shadow-xs">
                                    
                                    {/* CABECERA RECIBO TÉRMICO */}
                                    <div className="text-center border-b border-dashed border-neutral-200/50 pb-5 space-y-2">
                                        <div className="w-10 h-10 bg-neutral-950 text-white rounded-full flex items-center justify-center mx-auto border border-transparent shadow-xs">
                                            <ShieldCheck size={18} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h3 className="font-bold text-sm text-neutral-900">Auditoría Fiscal</h3>
                                            <p className="text-[10px] font-mono font-bold text-neutral-400">
                                                ID: {selectedTicket.id.split("-")[0].toUpperCase()}
                                            </p>
                                        </div>
                                    </div>

                                    {/* DESGLOSE REPORTADO */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                            Arqueo Contado Declarado
                                        </p>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-neutral-400">Efectivo USD</span>
                                                <span className="font-bold font-mono text-neutral-800">${selectedTicket.reported_totals.cash.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-neutral-400">Zelle / Digital</span>
                                                <span className="font-bold font-mono text-neutral-800">${selectedTicket.reported_totals.zelle.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-neutral-400">Otros POS / Tarjetas</span>
                                                <span className="font-bold font-mono text-neutral-800">${(selectedTicket.reported_totals.other || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-neutral-100/60">
                                                <span className="font-medium text-neutral-400">Pago Móvil Bs</span>
                                                <span className="font-bold font-mono text-neutral-800">Bs {selectedTicket.reported_totals.bs.toLocaleString("es-VE")}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DIFERENCIAS REPORTADAS */}
                                    <div className="space-y-2.5 pt-2 border-t border-dashed border-neutral-200/50">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                                            Balance de Diferencias
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {["cash", "zelle", "other", "bs"].map((key) => {
                                                const diff = selectedTicket.differences[key] || 0; 
                                                const isPerfect = diff === 0;
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`flex justify-between items-center text-[10px] font-bold p-2 rounded border ${isPerfect ? "bg-emerald-50/50 border-emerald-100/40 text-emerald-700" : diff > 0 ? "bg-blue-50/50 border-blue-100/40 text-blue-700" : "bg-rose-50/50 border-rose-100/40 text-rose-700"}`}
                                                    >
                                                        <span className="font-semibold">{key === "cash" ? "EFECTIVO" : key === "zelle" ? "ZELLE" : key === "other" ? "OTROS" : "PM BS"}</span>
                                                        <span className="font-mono">
                                                            {isPerfect ? "EXACTO" : diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* NOTAS */}
                                    {selectedTicket.notes && (
                                        <div className="pt-4 border-t border-dashed border-neutral-200/50">
                                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                                Observaciones del Turno
                                            </p>
                                            <p className="text-xs font-semibold text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200/50 italic">
                                                "{selectedTicket.notes}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* ACCIONES DE EXPORTACIÓN */}
                                <div className="mb-14 mt-4 flex gap-2">
                                    <button
                                        onClick={() => handleCopyWhatsApp(selectedTicket)}
                                        className="flex-1 bg-[#25D366] text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-[#20ba59] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm"
                                    >
                                        <Copy size={13} />
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => handleDownloadExcel(selectedTicket)}
                                        className="flex-1 bg-neutral-950 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                                    >
                                        <Download size={13} />
                                        Excel Contable
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}