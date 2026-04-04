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
    AlertTriangle,
    FileText,
    Copy, Clock, Sparkles, X, Download,
} from "lucide-react";
import ExcelJS from 'exceljs';
import Link from "next/link";
import { getSupabase } from "@/lib/supabase-client";
import { NumberInput } from "@/components/NumberInput"; // Ajusta la ruta según tu carpeta
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
        ordersCount: 0,
    });
    const [lastClosureDate, setLastClosureDate] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    // Data para el Gráfico de Anillo y Estado Interactivo
    const [activeSegment, setActiveSegment] = useState<string | null>(null);
    const [orderStats, setOrderStats] = useState({
        pending: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#F59E0B",
            label: "Pendientes",
            key: "pending",
        },
        paid: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#10B981",
            label: "Pagados",
            key: "paid",
        },
        shipped: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#3B82F6",
            label: "Enviados",
            key: "shipped",
        },
        cancelled: {
            count: 0,
            usd: 0,
            bs: 0,
            color: "#EF4444",
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
        amount: "",
        currency: "usd",
        paymentMethod: "cash",
        description: "",
    });
    const [reportedTotals, setReportedTotals] = useState({
        cash: "",
        zelle: "",
        bs: "",
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
        if (!storeId) return;
        const { data } = await supabase
            .from("cash_closures")
            .select("*")
            .eq("store_id", storeId)
            .order("closed_at", { ascending: false })
            .limit(10);

        if (data && data.length > 0) {
            setHistory(data);
            setLastClosureDate(data[0].closed_at);
        }
    }, [supabase, storeId]);

    const calculateFloatingCash = useCallback(async () => {
        if (!storeId) return;
        try {
            const [ordersRes, movementsRes] = await Promise.all([
                supabase
                    .from("orders")
                    .select("status, total_usd, total_bs, split_payments, payment_method")
                    .eq("store_id", storeId)
                    .is("closure_id", null),
                supabase
                    .from("cash_movements")
                    .select("type, amount, payment_method")
                    .eq("store_id", storeId)
                    .is("closure_id", null),
            ]);

            const floatingOrders = ordersRes.data;
            const floatingMovements = movementsRes.data;

            let tCash = 0,
                tZelle = 0,
                tBs = 0;
            const stats = {
                pending: {
                    count: 0,
                    usd: 0,
                    bs: 0,
                    color: "#F59E0B",
                    label: "Pendientes",
                    key: "pending",
                },
                paid: {
                    count: 0,
                    usd: 0,
                    bs: 0,
                    color: "#10B981",
                    label: "Pagados",
                    key: "paid",
                },
                shipped: {
                    count: 0,
                    usd: 0,
                    bs: 0,
                    color: "#3B82F6",
                    label: "Enviados",
                    key: "shipped",
                },
                cancelled: {
                    count: 0,
                    usd: 0,
                    bs: 0,
                    color: "#EF4444",
                    label: "Cancelados",
                    key: "cancelled",
                },
            };

            floatingOrders?.forEach((order: any) => {
                // 1. Clasificación Logística (Para el Gráfico)
                // Nota: Si el status es 'completed', lo contamos visualmente como 'shipped/entregado' para mantener el anillo limpio.
                const rawStatus = order.status || "pending";
                const st = (
                    rawStatus === "completed" ? "shipped" : rawStatus
                ) as keyof typeof stats;

                if (stats[st]) {
                    stats[st].count += 1;
                    stats[st].usd += Number(order.total_usd || 0);
                    stats[st].bs += Number(order.total_bs || 0);
                }

                // 2. Clasificación Financiera (El motor de la caja)
                // 🚀 LA SOLUCIÓN: El dinero entra a la caja si está Pagado, Enviado o Completado.
                const isFinanciallyPaid = ["paid", "shipped", "completed"].includes(
                    rawStatus,
                );

                if (isFinanciallyPaid) {
                    // Validamos que split_payments sea un array válido y no un string vacío
                    if (
                        Array.isArray(order.split_payments) &&
                        order.split_payments.length > 0
                    ) {
                        order.split_payments.forEach((p: any) => {
                            const m = (p.method || "").toLowerCase();
                            if (m.includes("efectivo") || m === "cash" || m === "usd")
                                tCash += Number(p.amount_usd);
                            else if (m.includes("zelle") || m.includes("binance"))
                                tZelle += Number(p.amount_usd);
                            else tBs += Number(p.amount_bs);
                        });
                    } else {
                        // Soporte para órdenes antiguas de pago único
                        const m = (order.payment_method || "").toLowerCase();
                        if (m.includes("efectivo") || m === "cash" || m === "usd")
                            tCash += Number(order.total_usd);
                        else if (m.includes("zelle") || m.includes("binance"))
                            tZelle += Number(order.total_usd);
                        else tBs += Number(order.total_bs || order.total_usd);
                    }
                }
            });

            floatingMovements?.forEach((mov: any) => {
                const amt = Number(mov.amount) * (mov.type === "out" ? -1 : 1);
                const m = (mov.payment_method || "").toLowerCase();

                if (m === "cash" || m.includes("efectivo")) tCash += amt;
                else if (m === "zelle" || m.includes("binance")) tZelle += amt;
                else tBs += amt;
            });

            // Sumamos para el badge solo las que requieren atención de arqueo
            const ordersToClose = stats.paid.count + stats.shipped.count;

            setTotals({
                usdCash: tCash,
                zelle: tZelle,
                bsTransfer: tBs,
                ordersCount: ordersToClose,
            });
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

    // ... (Mantén aquí intactas tus funciones handleSubmitMovement, handleFinalClosure y handleCopyWhatsApp) ...
    const handleSubmitMovement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;
        const numAmount = Number(movementData.amount);
        if (numAmount <= 0) {
            Swal.fire({
                icon: "error",
                title: "Monto Inválido",
                text: "El monto debe ser mayor a 0",
                customClass: { popup: "rounded-[var(--radius-card)]" },
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
                    popup: "rounded-xl text-xs font-bold bg-black text-white",
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
                title: "Error",
                text: "No se pudo guardar la operación.",
                customClass: { popup: "rounded-[var(--radius-card)]" },
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFinalClosure = async () => {
        if (!storeId || totals.ordersCount === 0) return;
        setIsSubmitting(true);
        const expected = {
            cash: totals.usdCash,
            zelle: totals.zelle,
            bs: totals.bsTransfer,
        };
        const reported = {
            cash: Number(reportedTotals.cash),
            zelle: Number(reportedTotals.zelle),
            bs: Number(reportedTotals.bs),
        };
        const diffs = {
            cash: reported.cash - expected.cash,
            zelle: reported.zelle - expected.zelle,
            bs: reported.bs - expected.bs,
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
                title: "¡Cierre Exitoso!",
                text: "La caja ha sido sellada y la jornada finalizada.",
                icon: "success",
                confirmButtonColor: "#000",
                customClass: { popup: "rounded-[var(--radius-card)]" },
            });
            setIsClosureDrawerOpen(false);
            setReportedTotals({ cash: "", zelle: "", bs: "" });
            setClosureNotes("");
            await calculateFloatingCash();
            await fetchHistoryAndContext();
        } catch (e) {
            Swal.fire("Error", "No se pudo completar el cierre.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopyWhatsApp = (ticket: any) => {
        const date = new Date(ticket.closed_at).toLocaleString("es-VE");
        const t = ticket.reported_totals;
        const d = ticket.differences;
        let text = `*CIERRE DE CAJA - PREZISO*\nFecha: ${date}\n\n*ARQUEO FÍSICO (REPORTADO):*\n💵 Efectivo USD: *$${t.cash.toFixed(2)}*\n📱 Zelle: *$${t.zelle.toFixed(2)}*\n🏦 Pago Móvil: *Bs ${t.bs.toLocaleString("es-VE")}*\n\n*DIFERENCIAS DETECTADAS:*\nEfectivo: ${d.cash === 0 ? "Exacto ✅" : d.cash > 0 ? `Sobra $${d.cash} ⚠️` : `Falta $${Math.abs(d.cash)} ❌`}\nZelle: ${d.zelle === 0 ? "Exacto ✅" : d.zelle > 0 ? `Sobra $${d.zelle} ⚠️` : `Falta $${Math.abs(d.zelle)} ❌`}\nPago Móvil: ${d.bs === 0 ? "Exacto ✅" : d.bs > 0 ? `Sobra Bs ${d.bs} ⚠️` : `Falta Bs ${Math.abs(d.bs)} ❌`}\n`;
        if (ticket.notes) text += `\n*NOTAS:*\n_${ticket.notes}_\n`;
        navigator.clipboard.writeText(text);
        const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 2000,
            customClass: {
                popup: "rounded-xl text-xs font-bold bg-black text-white",
            },
        });
        Toast.fire({ icon: "success", title: "Copiado al portapapeles" });
    };

    const handleDownloadExcel = async (ticket: any) => {
    if (!ticket) return;

    // 1. Inicializar el Libro y la Hoja de Trabajo
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Preziso';
    const sheet = workbook.addWorksheet('Cierre de Caja');

    const date = new Date(ticket.closed_at).toLocaleString('es-VE');
    const expected = ticket.expected_totals;
    const reported = ticket.reported_totals;
    const diffs = ticket.differences;

    // 2. Configurar Anchos de Columna Automáticos
    sheet.columns = [
        { key: 'concepto', width: 25 },
        { key: 'esperado', width: 22 },
        { key: 'reportado', width: 22 },
        { key: 'diferencia', width: 20 }
    ];

    // 3. Construir la Cabecera Visual (Celdas Combinadas)
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'REPORTE DE CIERRE DE CAJA - PREZISO';
    titleCell.font = { name: 'Arial', family: 4, size: 14, bold: true };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    sheet.addRow(['ID de Cierre', ticket.id.toUpperCase(), '', '']);
    sheet.addRow(['Fecha y Hora', date, '', '']);
    sheet.addRow([]); // Fila vacía para respirar

    // 4. Cabeceras de la Tabla de Datos
    const headerRow = sheet.addRow(['CONCEPTO', 'SISTEMA (ESPERADO)', 'ARQUEO (REPORTADO)', 'DIFERENCIA']);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };
    
    // Borde inferior para separar cabeceras
    headerRow.eachCell((cell) => {
        cell.border = { bottom: { style: 'thin' } };
    });

    // 5. Inserción de Datos (Números Reales, NO Strings)
    const addFinancialRow = (concepto: string, exp: number, rep: number, diff: number, symbol: string) => {
        const row = sheet.addRow([concepto, exp, rep, diff]);
        
        // Formateo nativo de Excel: Se adapta a la PC del usuario pero muestra el símbolo correcto
        const format = `"${symbol}" #,##0.00;[Red]-"${symbol}" #,##0.00`;
        row.getCell(2).numFmt = format;
        row.getCell(3).numFmt = format;
        row.getCell(4).numFmt = format;
    };

    addFinancialRow('Efectivo (USD)', expected.cash, reported.cash, diffs.cash, '$');
    addFinancialRow('Zelle / Digital (USD)', expected.zelle, reported.zelle, diffs.zelle, '$');
    addFinancialRow('Pago Móvil (Bs)', expected.bs, reported.bs, diffs.bs, 'Bs');

    sheet.addRow([]); // Fila vacía

    // 6. Notas del Cajero
    const notesLabel = sheet.addRow(['NOTAS DEL CAJERO']);
    notesLabel.font = { bold: true };
    
    sheet.mergeCells(`A${sheet.rowCount}:D${sheet.rowCount}`); // Combinar celdas para el texto largo
    const notesContent = sheet.addRow([ticket.notes || 'Sin notas registradas']);
    notesContent.alignment = { wrapText: true }; // Permitir salto de línea si es muy largo

    // 7. Generar y Descargar el Archivo (Buffer)
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
    URL.revokeObjectURL(url); // Limpiar memoria

    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, customClass: { popup: 'rounded-xl text-xs font-bold bg-black text-white' } });
    Toast.fire({ icon: 'success', title: 'Excel Contable Descargado' });
};
    // --- VARIANTES DE ANIMACIÓN ---
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
            <div className="min-h-screen bg-[#F6F6F6] pb-24 font-sans text-[#111] flex flex-col relative">
                <header className="bg-[#F6F6F6]/80 backdrop-blur-xl sticky top-0 z-30 px-5 md:px-10 py-5 flex justify-between items-center transition-all">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin"
                            className="p-2.5 bg-white rounded-full hover:scale-105 active:scale-95 transition-all group shrink-0 shadow-sm border border-black/5"
                        >
                            <ArrowLeft
                                size={18}
                                className="text-gray-500 group-hover:text-black transition-colors"
                            />
                        </Link>
                        <div>
                            <h1 className="font-black text-2xl tracking-tight leading-none text-[#111]">
                                Finanzas
                            </h1>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                Cierre de Caja
                            </p>
                        </div>
                    </div>
                </header>
                <main className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-20">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl shadow-black/5 border border-gray-100 mb-8"
                    >
                        <Sparkles size={36} className="text-[#111]" />
                    </motion.div>
                    <h2 className="text-3xl font-black text-[#111] mb-4 tracking-tight">
                        El control total de tu dinero, <br />
                        está en camino.
                    </h2>
                    <p className="text-sm font-bold text-gray-400 max-w-md mx-auto mb-10 leading-relaxed">
                        Estamos afinando un motor contable de grado bancario que te
                        permitirá conciliar efectivo, Zelle y Pago Móvil sin tocar un solo
                        Excel.
                    </p>
                    <div className="bg-[#111] text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-black/10 flex items-center gap-2">
                        <ShieldCheck size={16} /> Próximamente en Preziso
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F6F6F6] pb-24 font-sans text-[#111] flex flex-col relative">
            {/* HEADER */}
            <header className="bg-[#F6F6F6]/80 backdrop-blur-xl sticky top-0 z-30 px-5 md:px-10 py-5 flex justify-between items-center transition-all">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin"
                        className="p-2.5 bg-white rounded-full hover:scale-105 active:scale-95 transition-all group shrink-0  border border-black/5"
                    >
                        <ArrowLeft
                            size={18}
                            className="text-gray-500 group-hover:text-black transition-colors"
                        />
                    </Link>
                    <div>
                        <h1 className="font-black text-2xl tracking-tight leading-none text-[#111]">
                            Caja
                        </h1>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            Conciliación Diaria
                        </p>
                    </div>
                </div>
                <div className="bg-emerald-100/50 text-emerald-800 px-4 py-2 rounded-full flex items-center gap-2 border border-emerald-200/50">
                    <ShieldCheck size={16} className="shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
                        Turno Abierto
                    </span>
                </div>
            </header>

            <main className="w-full max-w-[1200px] mx-auto px-5 md:px-10 py-8 space-y-12">
                {/* SECCIÓN 1: DINERO EN TRÁNSITO */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-sm font-black text-[#111] uppercase tracking-widest">
                                Dinero en Tránsito
                            </h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                                <Clock size={10} /> Desde:{" "}
                                {lastClosureDate
                                    ? new Date(lastClosureDate).toLocaleString("es-VE", {
                                        day: "2-digit",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })
                                    : "Apertura"}
                            </p>
                        </div>
                        <span className="text-[10px] font-black bg-white text-black px-3 py-1.5 rounded-full  border border-black/20">
                            {totals.ordersCount} Órdenes a Sellar
                        </span>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="animate-spin text-gray-300" size={32} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                            {/* Tarjetas de Efectivo... (Intactas) */}
                            <div className="relative overflow-hidden bg-white p-7 rounded-[var(--radius-card)]  flex flex-col justify-between min-h-[140px] sm:col-span-2 lg:col-span-1 after:content-[''] after:absolute after:-top-4 after:-right-4 after:w-24 after:h-24 after:bg-[#00cd6133] after:rounded-full after:blur-2xl">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                                        Efectivo
                                        <br />
                                        Físico USD
                                    </p>
                                    <div className="w-10 h-10 bg-[#F6F6F6] rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                        <Banknote size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <p
                                    className={`text-4xl font-black tracking-tighter ${totals.usdCash < 0 ? "text-red-500" : "text-[#111]"}`}
                                >
                                    ${totals.usdCash.toFixed(2)}
                                </p>
                            </div>
                            <div className="relative overflow-hidden bg-white p-7 rounded-[var(--radius-card)]  flex flex-col justify-between min-h-[140px] sm:col-span-2 lg:col-span-1 after:content-[''] after:absolute after:-top-4 after:-right-4 after:w-24 after:h-24 after:bg-[#8b44ff5e] after:rounded-full after:blur-2xl">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                                        Zelle /<br />
                                        Binance Pay
                                    </p>
                                    <div className="w-10 h-10 bg-[#F6F6F6] rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                        <DollarSign size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <p
                                    className={`text-4xl font-black tracking-tighter ${totals.zelle < 0 ? "text-red-500" : "text-[#111]"}`}
                                >
                                    ${totals.zelle.toFixed(2)}
                                </p>
                            </div>
                           <div className="relative overflow-hidden bg-white p-7 rounded-[var(--radius-card)]  flex flex-col justify-between min-h-[140px] sm:col-span-2 lg:col-span-1 after:content-[''] after:absolute after:-top-4 after:-right-4 after:w-24 after:h-24 after:bg-[#44a2ff5e] after:rounded-full after:blur-2xl">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                                        Transferencias
                                        <br />
                                        Pago Móvil Bs
                                    </p>
                                    <div className="w-10 h-10 bg-[#F6F6F6] rounded-full flex items-center justify-center text-gray-500 shrink-0">
                                        <CreditCard size={18} strokeWidth={2.5} />
                                    </div>
                                </div>
                                <p
                                    className={`text-4xl font-black tracking-tighter ${totals.bsTransfer < 0 ? "text-red-500" : "text-[#111]"}`}
                                >
                                    <span className="text-2xl mr-1">Bs</span>
                                    {totals.bsTransfer.toLocaleString("es-VE", {
                                        maximumFractionDigits: 2,
                                    })}
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                {/* SECCIÓN 1.5: EL PULSO OPERATIVO (GRÁFICO DE ANILLO INTERACTIVO) */}
                <section>
                    <h2 className="text-sm font-black text-[#111] uppercase tracking-widest mb-6">
                        Pulso del Turno
                    </h2>
                    <div className="bg-white p-6 md:p-8 rounded-[var(--radius-card)] card-interactive flex flex-col md:flex-row items-center gap-8 md:gap-12 min-h-[220px]">
                        {/* El SVG Vectorial Interactivo */}
                        <div
                            className="relative w-40 h-40 shrink-0 flex items-center justify-center cursor-pointer"
                            onClick={() => setActiveSegment(null)}
                        >
                            <svg viewBox="-2 0 40 36" className="w-full h-full -rotate-90 ">
                                <circle
                                    cx="18"
                                    cy="18"
                                    r="15.9155"
                                    fill="transparent"
                                    stroke="#F4F4F5"
                                    strokeWidth="3"
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
                                                strokeWidth="4"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                className={`transition-all duration-500 ease-out hover:stroke-[6px] ${isMuted ? "opacity-20" : "opacity-100"} cursor-pointer`}
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
                                    className="text-2xl font-black text-[#111] leading-none"
                                    style={{
                                        color: activeSegment
                                            ? (orderStats as any)[activeSegment].color
                                            : "#111",
                                    }}
                                >
                                    {activeSegment
                                        ? (orderStats as any)[activeSegment].count
                                        : Object.values(orderStats).reduce(
                                            (acc, curr) => acc + curr.count,
                                            0,
                                        )}
                                </span>
                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    {activeSegment
                                        ? (orderStats as any)[activeSegment].label
                                        : "Total"}
                                </span>
                            </div>
                        </div>

                        {/* Leyenda y Datos (Solución Móvil sin Hover) */}
                        <div className="flex-1 w-full grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {Object.entries(orderStats).map(([key, stat]) => {
                                const isActive = activeSegment === key;
                                const isMuted = activeSegment && activeSegment !== key;

                                return (
                                    <div
                                        key={key}
                                        onClick={() => setActiveSegment(isActive ? null : key)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer group 
                                            ${isActive ? "bg-white shadow-md border-black/10 scale-[1.02]" : "bg-[#F9FAFB] border-transparent"} 
                                            ${isMuted ? "opacity-40 grayscale" : "opacity-100"}
                                            hover:bg-white hover:shadow-subtle hover:border-black/5
                                        `}
                                    >
                                        <div className="flex items-center gap-2 mb-3">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full shadow-sm"
                                                style={{ backgroundColor: stat.color }}
                                            />
                                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
                                                {stat.label}
                                            </p>
                                        </div>
                                        <p className="text-2xl font-black text-[#111] leading-none mb-1">
                                            {stat.count}
                                        </p>
                                        {/* 🚀 SOLUCIÓN MÓVIL: Siempre visible en móvil, se oculta en desktop hasta que haces hover O haces click */}
                                        <div
                                            className={`mt-2 transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-100 lg:opacity-0 lg:group-hover:opacity-100"}`}
                                        >
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">
                                                <span className="text-[#111]">
                                                    ${stat.usd.toFixed(0)}
                                                </span>{" "}
                                                / Bs {stat.bs.toFixed(0)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* SECCIÓN 2: ACCIONES OPERATIVAS */}
                {/* ... (El resto del código hacia abajo se mantiene exactamente igual a tu versión anterior) ... */}
                <section>
                    <h2 className="text-sm font-black text-[#111] uppercase tracking-widest mb-6">
                        Acciones Operativas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                        <button
                            onClick={() => setIsMovementDrawerOpen(true)}
                            className="bg-white p-6 rounded-[var(--radius-card)] card-interactive flex items-center gap-5 text-left group"
                        >
                            <div className="w-14 h-14 bg-[#F6F6F6] rounded-full flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors duration-300 shrink-0">
                                <Plus size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-lg text-[#111] truncate">
                                    Ajuste de Caja
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 mt-1 truncate">
                                    Registrar gastos o ingresos.
                                </p>
                            </div>
                            <ArrowRight
                                size={20}
                                className="text-gray-300 group-hover:text-black group-hover:translate-x-1 transition-all shrink-0 hidden sm:block"
                            />
                        </button>

                        <button
                            onClick={() =>
                                totals.ordersCount > 0
                                    ? setIsClosureDrawerOpen(true)
                                    : Swal.fire(
                                        "Caja Vacía",
                                        "No hay órdenes pagadas para cerrar.",
                                        "info",
                                    )
                            }
                            className="bg-[#111] p-6 rounded-[var(--radius-card)] shadow-xl shadow-black/10 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.98] transition-all duration-300 flex items-center gap-5 text-left group"
                        >
                            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white shrink-0">
                                <Wallet size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-lg text-white truncate">
                                    Cierre Diario
                                </h3>
                                <p className="text-[11px] font-bold text-gray-400 mt-1 truncate">
                                    Sellar caja y arquear {totals.ordersCount} órdenes.
                                </p>
                            </div>
                            <ArrowRight
                                size={20}
                                className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0 hidden sm:block"
                            />
                        </button>
                    </div>
                </section>

                {/* SECCIÓN 3: HISTORIAL DE CIERRES (LA BÓVEDA) */}
                <section>
                    <h2 className="text-sm font-black text-[#111] uppercase tracking-widest mb-6">
                        Historial de Cierres
                    </h2>
                    {history.length === 0 ? (
                        <div className="bg-white rounded-[var(--radius-card)] p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-[#F6F6F6] rounded-full flex items-center justify-center mb-4">
                                <FileText size={24} className="text-gray-400" />
                            </div>
                            <h3 className="font-black text-gray-900 mb-1">
                                No hay cierres aún
                            </h3>
                            <p className="text-xs font-bold text-gray-400">
                                Tus tickets Z aparecerán aquí.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
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
                                        className="w-full bg-white p-5 rounded-2xl card-interactive flex flex-col sm:flex-row sm:items-center justify-between gap-4 group text-left border border-transparent hover:border-black/5"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-[#F6F6F6] rounded-full flex items-center justify-center text-gray-500 shrink-0 group-hover:bg-black group-hover:text-white transition-colors">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <p className="font-black text-[#111]">
                                                    {new Date(ticket.closed_at).toLocaleDateString(
                                                        "es-VE",
                                                        { weekday: "long", day: "numeric", month: "long" },
                                                    )}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                    {new Date(ticket.closed_at).toLocaleTimeString(
                                                        "es-VE",
                                                        { hour: "2-digit", minute: "2-digit" },
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 pl-14 sm:pl-0">
                                            <div
                                                className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${isPerfect ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                                            >
                                                {isPerfect ? (
                                                    <CheckCircle size={12} />
                                                ) : (
                                                    <AlertTriangle size={12} />
                                                )}
                                                {isPerfect ? "Cuadre Perfecto" : "Diferencias"}
                                            </div>
                                            <ArrowRight
                                                size={16}
                                                className="text-gray-300 group-hover:text-black transition-colors hidden sm:block"
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
            {/* DRAWER 1: MOVIMIENTOS (Ajustes de Caja) */}
            {/* ========================================================= */}
            <AnimatePresence>
                {isMovementDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsMovementDrawerOpen(false)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[460px] bg-white h-full flex flex-col shadow-2xl"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-[#111] leading-tight">
                                        Ajuste de Caja
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                        Registra un ingreso o gasto
                                    </p>
                                </div>
                                <button
                                    onClick={() =>
                                        !isSubmitting && setIsMovementDrawerOpen(false)
                                    }
                                    className="p-2.5 bg-[#F6F6F6] hover:bg-gray-200 rounded-full text-gray-500 transition-colors shrink-0"
                                >
                                    <X size={20} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 no-scrollbar">
                                <form
                                    id="movement-form"
                                    onSubmit={handleSubmitMovement}
                                    className="space-y-8 mt-2"
                                >
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                            Dirección de los Fondos
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMovementData({ ...movementData, type: "out" })
                                                }
                                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs transition-all border ${movementData.type === "out" ? "bg-red-50/50 border-red-500 text-red-600 " : "bg-transparent border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}
                                            >
                                                <ArrowUpFromLine size={20} /> Gasto / Retiro
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setMovementData({ ...movementData, type: "in" })
                                                }
                                                className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs transition-all border ${movementData.type === "in" ? "bg-emerald-50/50 border-emerald-500 text-emerald-600 " : "bg-transparent border-gray-100 text-gray-400 hover:bg-gray-50 hover:text-gray-600"}`}
                                            >
                                                <ArrowDownToLine size={20} /> Ingreso / Base
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                                Monto a Ajustar
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">
                                                    {movementData.currency === "usd" ? "$" : "Bs"}
                                                </span>
                                                <NumberInput
                                                    step="0.01"
                                                    required
                                                    value={movementData.amount}
                                                    onChange={(e) =>
                                                        setMovementData({
                                                            ...movementData,
                                                            amount: e.target.value,
                                                        })
                                                    }
                                                    className="w-full bg-[#F4F4F5] border-2 border-transparent focus:bg-white focus:border-black rounded-2xl pl-9 pr-4 py-3.5 text-base font-black outline-none transition-all shadow-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                                Caja Afectada
                                            </label>
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
                                                className="w-full bg-[#F4F4F5] border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-4 py-3.5 text-sm font-black text-[#111] outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="cash">Efectivo USD</option>
                                                <option value="zelle">Zelle / Binance</option>
                                                <option value="transfer">Pago Móvil (Bs)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                            Concepto / Razón
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            maxLength={50}
                                            value={movementData.description}
                                            onChange={(e) =>
                                                setMovementData({
                                                    ...movementData,
                                                    description: e.target.value,
                                                })
                                            }
                                            className="w-full bg-[#F4F4F5] border-2 border-transparent focus:bg-white focus:border-black rounded-2xl px-4 py-3.5 text-sm font-bold outline-none transition-all"
                                            placeholder="Ej: Pago a motorizado, Base inicial..."
                                        />
                                    </div>
                                    <div className=" md:mb-0 mb-14 bg-white  border-t border-gray-100 shrink-0">
                                        <button
                                            type="submit"
                                            form="movement-form"
                                            disabled={isSubmitting}
                                            className="w-full  bg-[#111] text-white font-black text-sm uppercase tracking-widest py-4.5 rounded-[var(--radius-btn)] shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                                        >
                                            {isSubmitting ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Save size={18} />
                                            )}
                                            Registrar Operación
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* DRAWER 2: CIERRE DIARIO */}
            {/* ========================================================= */}
            <AnimatePresence>
                {isClosureDrawerOpen && (
                    <div className="fixed inset-0 z-[100] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => !isSubmitting && setIsClosureDrawerOpen(false)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative w-full max-w-[500px] bg-white h-full flex flex-col shadow-2xl"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-[#111] leading-tight">
                                        Arqueo de Caja
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">
                                        Verifica tu dinero en físico
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsClosureDrawerOpen(false)}
                                    className="p-2.5 bg-[#F6F6F6] hover:bg-gray-200 rounded-full text-gray-500 transition-colors shrink-0"
                                >
                                    <X size={20} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8 space-y-8 no-scrollbar">
                                <div className="space-y-5 mt-2">
                                    {[
                                        {
                                            label: "Efectivo USD",
                                            key: "cash",
                                            expected: totals.usdCash,
                                            symbol: "$",
                                        },
                                        {
                                            label: "Zelle / Binance",
                                            key: "zelle",
                                            expected: totals.zelle,
                                            symbol: "$",
                                        },
                                        {
                                            label: "Pago Móvil Bs",
                                            key: "bs",
                                            expected: totals.bsTransfer,
                                            symbol: "Bs ",
                                        },
                                    ].map((row) => {
                                        const diff =
                                            Number((reportedTotals as any)[row.key]) - row.expected;
                                        const hasInput = (reportedTotals as any)[row.key] !== "";
                                        return (
                                            <div
                                                key={row.key}
                                                className="bg-white p-5 rounded-2xl border border-gray-200/60 relative overflow-hidden group focus-within:border-black/10  transition-all"
                                            >
                                                {hasInput && (
                                                    <div
                                                        className={`absolute top-0 bottom-0 left-0 w-1.5 ${diff === 0 ? "bg-emerald-500" : diff > 0 ? "bg-blue-500" : "bg-red-500"}`}
                                                    />
                                                )}
                                                <div className="flex justify-between items-center mb-4 pl-2">
                                                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                                                        {row.label}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-gray-500 bg-[#F6F6F6] px-2 py-1 rounded-full">
                                                        Esperado:{" "}
                                                        <span className="font-black text-[#111]">
                                                            {row.symbol}
                                                            {row.expected.toFixed(2)}
                                                        </span>
                                                    </span>
                                                </div>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pl-2">
                                                    <div className="relative flex-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-black">
                                                            {row.symbol.trim()}
                                                        </span>
                                                        <NumberInput
                                                            step="0.01"
                                                            placeholder="Monto Real..."
                                                            className=" w-full bg-[#F4F4F5] border border-transparent focus:bg-white focus:border-black/40 focus:shadow-none rounded-xl pl-8 pr-4 py-3 font-black text-[#111] outline-none transition-all placeholder:font-bold"
                                                            value={(reportedTotals as any)[row.key]}
                                                            onChange={(e) =>
                                                                setReportedTotals({
                                                                    ...reportedTotals,
                                                                    [row.key]: e.target.value,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                    {hasInput && (
                                                        <div
                                                            className={`shrink-0 flex items-center justify-end sm:justify-start gap-1.5 font-black text-sm px-3 py-2 rounded-xl ${diff === 0 ? "bg-emerald-50 text-emerald-600" : diff > 0 ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"}`}
                                                        >
                                                            {diff === 0 ? (
                                                                <CheckCircle size={16} />
                                                            ) : (
                                                                <AlertTriangle size={16} />
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
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">
                                        Notas Adicionales (Opcional)
                                    </label>
                                    <textarea
                                        placeholder="Ej: Faltaron 5 dólares que el cliente quedó debiendo..."
                                        className="w-full bg-[#F4F4F5] rounded-2xl px-4 py-4 text-sm font-bold text-[#111] outline-none focus:bg-white border-2 border-transparent focus:border-black transition-all resize-none placeholder:font-medium"
                                        rows={3}
                                        value={closureNotes}
                                        onChange={(e) => setClosureNotes(e.target.value)}
                                    />
                                </div>
                                <div className=" md:mb-10 mb-14  bg-white border-t border-gray-100 shrink-0">
                                    <button
                                        onClick={handleFinalClosure}
                                        disabled={
                                            isSubmitting ||
                                            reportedTotals.cash === "" ||
                                            reportedTotals.zelle === "" ||
                                            reportedTotals.bs === ""
                                        }
                                        className="w-full bg-[#111] text-white py-4.5 rounded-[var(--radius-btn)] font-black text-sm uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="animate-spin" size={18} />
                                        ) : (
                                            <Save size={18} />
                                        )}
                                        Sellar Caja y Finalizar
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ========================================================= */}
            {/* DRAWER 3: VISOR DE TICKET Z */}
            {/* ========================================================= */}
            <AnimatePresence>
                {selectedTicket && (
                    <div className="fixed inset-0 z-[100] flex justify-end scrollbar-thin no-scrollbar overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setSelectedTicket(null)}
                        />
                        <motion.div
                            variants={drawerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="relative  w-full max-w-[400px] bg-[#F6F6F6] h-full flex flex-col shadow-2xl"
                        >
                            <div className="p-6 md:p-8 flex justify-between items-start shrink-0 bg-white border-b border-gray-100">
                                <div>
                                    <h2 className="text-2xl font-black text-[#111] leading-tight">
                                        Ticket Z
                                    </h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                        <Clock size={12} />{" "}
                                        {new Date(selectedTicket.closed_at).toLocaleString("es-VE")}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="p-2.5 bg-[#F6F6F6] hover:bg-gray-200 rounded-full text-gray-500 transition-colors shrink-0"
                                >
                                    <X size={20} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin no-scrollbar overflow-y-auto">
                                <div className="bg-white p-6 rounded-2xl  border-transparent  space-y-6">
                                    {/* CABECERA TICKET */}
                                    <div className="text-center border-b border-dashed border-gray-200 pb-6">
                                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-3">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <h3 className="font-black text-lg text-[#111]">
                                            Cierre de Jornada
                                        </h3>
                                        <p className="text-xs font-mono font-bold text-gray-400 mt-1">
                                            ID: {selectedTicket.id.split("-")[0].toUpperCase()}
                                        </p>
                                    </div>

                                    {/* DESGLOSE */}
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Arqueo Declarado
                                        </p>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-gray-500">
                                                Efectivo USD
                                            </span>
                                            <span className="font-black font-mono text-[#111]">
                                                ${selectedTicket.reported_totals.cash.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-bold text-gray-500">
                                                Zelle / Digital
                                            </span>
                                            <span className="font-black font-mono text-[#111]">
                                                ${selectedTicket.reported_totals.zelle.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pb-4 border-b border-dashed border-gray-200">
                                            <span className="font-bold text-gray-500">
                                                Pago Móvil Bs
                                            </span>
                                            <span className="font-black font-mono text-[#111]">
                                                Bs{" "}
                                                {selectedTicket.reported_totals.bs.toLocaleString(
                                                    "es-VE",
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* DIFERENCIAS */}
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Diferencias (Faltantes/Sobrantes)
                                        </p>
                                        {["cash", "zelle", "bs"].map((key) => {
                                            const diff = selectedTicket.differences[key];
                                            const isPerfect = diff === 0;
                                            return (
                                                <div
                                                    key={key}
                                                    className={`flex justify-between items-center text-xs font-bold p-2.5 rounded-lg ${isPerfect ? "bg-emerald-50 text-emerald-700" : diff > 0 ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700"}`}
                                                >
                                                    <span className="uppercase tracking-wide">
                                                        {key === "cash"
                                                            ? "EFECTIVO"
                                                            : key === "zelle"
                                                                ? "ZELLE"
                                                                : "PM BS"}
                                                    </span>
                                                    <span className="font-black font-mono">
                                                        {isPerfect
                                                            ? "EXACTO"
                                                            : diff > 0
                                                                ? `+${diff.toFixed(2)}`
                                                                : `${diff.toFixed(2)}`}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedTicket.notes && (
                                        <div className="pt-4 border-t border-dashed border-gray-200">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                Notas del Cajero
                                            </p>
                                            <p className="text-xs font-bold text-gray-600 bg-[#F6F6F6] p-3 rounded-xl italic">
                                                "{selectedTicket.notes}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="  mb-14 mt-5 shrink-0 flex gap-3">
                                    <button
                                        onClick={() => handleCopyWhatsApp(selectedTicket)}
                                        className="flex-1 bg-[#25D366] text-white py-4.5 rounded-[var(--radius-btn)] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Copy size={16} />
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => handleDownloadExcel(selectedTicket)}
                                        className="flex-1 bg-[#111] text-white py-4.5 rounded-[var(--radius-btn)] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Download size={16} />
                                        CSV
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
